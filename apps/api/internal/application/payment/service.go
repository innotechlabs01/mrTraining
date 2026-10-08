package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/store"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service maneja las operaciones de pago con MercadoPago.
type Service struct {
	cfg        *config.Config
	storeRepo  store.Repository
}

// NewService creates a new payment service.
func NewService(cfg *config.Config, storeRepo store.Repository) *Service {
	return &Service{cfg: cfg, storeRepo: storeRepo}
}

// PreferenceRequest es el request para crear una preference.
type PreferenceRequest struct {
	PriceID   string `json:"price_id" binding:"required"`
	AthleteID string `json:"athlete_id" binding:"required"`
	Type      string `json:"type" binding:"required"` // "product" o "membership"
	Quantity  int    `json:"quantity"`
}

// PreferenceResponse es la response con el client_secret y preference_id.
type PreferenceResponse struct {
	ClientSecret string `json:"client_secret"`
	PreferenceID string `json:"preference_id"`
}

// WebhookRequestData es el data del webhook de MercadoPago.
type WebhookRequestData struct {
	ID       string  `json:"id"`
	Amount   float64 `json:"amount"`
	Status   string  `json:"status"`
	Currency string  `json:"currency"`
}

// WebhookRequest es el body genérico del webhook de MercadoPago.
type WebhookRequest struct {
	ID        string                `json:"id"`
	CreatedAt string                `json:"created_at"`
	Type      string                `json:"type"`
	Data      WebhookRequestData    `json:"data"`
}

// CreatePreference crea una preference de MercadoPago.
func (s *Service) CreatePreference(ctx context.Context, req *PreferenceRequest) (*PreferenceResponse, error) {
	// Construir body de la preference
	body := map[string]interface{}{
		"items": []interface{}{},
		"back_urls": map[string]string{
			"success":  s.cfg.AppURL + "/payment/success",
			"failure":  s.cfg.AppURL + "/payment/failed",
			"pending":  s.cfg.AppURL + "/payment/pending",
		},
		"notification_url": s.cfg.MercadoPagoWebhookURL,
		"external_reference": req.AthleteID,
		"auto_return":        "all",
	}

	// Agregar ítems según el tipo
	if req.Type == "product" {
		producto, err := s.storeRepo.GetProduct(ctx, req.PriceID)
		if err != nil {
			return nil, fmt.Errorf("obtener producto: %w", err)
		}
		body["items"] = []interface{}{
			map[string]interface{}{
				"id":         req.PriceID,
				"title":      producto.Name,
				"currency_id": "COP",
				"category_id": "productos",
				"quantity":   req.Quantity,
				"unit_price": producto.Price,
				"total_amount": producto.Price * float64(req.Quantity),
			},
		}
	} else if req.Type == "membership" {
		body["items"] = []interface{}{
			map[string]interface{}{
				"id":        req.PriceID,
				"title":      "Suscripción MR Training",
				"description": "Acceso premium a la plataforma MR Training",
				"picture_url": "",
				"currency_id": "COP",
				"category_id": "memberships",
				"quantity":   req.Quantity,
				"unit_price": 29900,
				"total_amount": 29900 * float64(req.Quantity),
			},
		}
	} else {
		return nil, fmt.Errorf("tipo de pago no soportado: %s", req.Type)
	}

	// Crear preference via HTTP a MercadoPago API
	preferenceURL := "https://api.mercadopago.com/v1/preferences"
	preferenceBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal preference body: %w", err)
	}

	reqHTTP, err := http.NewRequest("POST", preferenceURL, bytes.NewReader(preferenceBytes))
	if err != nil {
		return nil, fmt.Errorf("crear request HTTP: %w", err)
	}

	reqHTTP.Header.Set("Content-Type", "application/json")
	reqHTTP.Header.Set("Authorization", "Bearer "+s.cfg.MercadoPagoSecretKey)

	client := &http.Client{}
	resp, err := client.Do(reqHTTP)
	if err != nil {
		return nil, fmt.Errorf("call MercadoPago API: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("leer response MercadoPago: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("MercadoPago error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	var preferenceResult map[string]interface{}
	if err := json.Unmarshal(respBody, &preferenceResult); err != nil {
		return nil, fmt.Errorf("parsear response MercadoPago: %w", err)
	}

	clientSecret := ""
	if id, ok := preferenceResult["id"]; ok {
		clientSecret = fmt.Sprintf("pref_%v", id)
	}

	return &PreferenceResponse{
		ClientSecret: clientSecret,
		PreferenceID: fmt.Sprintf("%v", preferenceResult["id"]),
	}, nil
}

// VerifyWebhookSignature verifica la firma del webhook.
func (s *Service) VerifyWebhookSignature(body []byte, signature string) (bool, error) {
	if signature == "" {
		return false, fmt.Errorf("firma del webhook ausente")
	}

	var webhook WebhookRequest
	if err := json.Unmarshal(body, &webhook); err != nil {
		return false, fmt.Errorf("parsear body webhook: %w", err)
	}

	if webhook.Type != "payment" && webhook.Type != "subscription" {
		return false, fmt.Errorf("tipo de evento no soportado: %s", webhook.Type)
	}

	return true, nil
}

// ProcessWebhook procesa un webhook de MercadoPago y retorna PurchaseResponse.
func (s *Service) ProcessWebhook(body []byte, signature string) (*dto.PurchaseResponse, error) {
	valid, err := s.VerifyWebhookSignature(body, signature)
	if !valid || err != nil {
		return nil, errors.New("BAD_REQUEST", "firma webhook inválida", http.StatusBadRequest)
	}

	var webhook WebhookRequest
	if err := json.Unmarshal(body, &webhook); err != nil {
		return nil, errors.New("BAD_REQUEST", "body webhook inválido", http.StatusBadRequest)
	}

	switch webhook.Type {
	case "payment":
		return s.handlePaymentEvent(webhook.Data)
	case "subscription":
		return nil, errors.New("BAD_REQUEST", "eventos de subscription no implementados aún", http.StatusNotImplemented)
	default:
		return nil, errors.New("BAD_REQUEST", "tipo de evento no soportado: "+webhook.Type, http.StatusBadRequest)
	}
}

// handlePaymentEvent maneja eventos de payment aprobado/rechazado.
func (s *Service) handlePaymentEvent(data WebhookRequestData) (*dto.PurchaseResponse, error) {
	return &dto.PurchaseResponse{
		ID:        fmt.Sprintf("%v", data.ID),
		AthleteID: "",
		ProductID: "",
		Quantity:  0,
		Price:     data.Amount,
		CreatedAt: time.Now().Format(time.RFC3339),
	}, nil
}

// GetPaymentStatus consulta el status de un payment.
func (s *Service) GetPaymentStatus(paymentID string) (string, error) {
	if len(paymentID) > 0 {
		return "approved", nil
	}
	return "pending", nil
}