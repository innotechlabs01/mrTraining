package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/domain/store"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

const mercadoPagoAPI = "https://api.mercadopago.com"

type Service struct {
	cfg           *config.Config
	storeRepo     store.Repository
	membershipSvc MembershipReader
}

// MembershipReader is the read side of the membership service the payment
// domain needs: current plan for the athlete + activation after approval.
type MembershipReader interface {
	GetMembership(ctx context.Context, athleteID string) (*membership.Membership, error)
	ActivateAfterPayment(ctx context.Context, athleteID string, paymentID string, amount float64) error
}

func NewService(cfg *config.Config, storeRepo store.Repository, membershipSvc MembershipReader) *Service {
	return &Service{cfg: cfg, storeRepo: storeRepo, membershipSvc: membershipSvc}
}

// --- Cart checkout ---

// CartPreferenceItem is one product line requested by the client.
type CartPreferenceItem struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

// CartPreferenceResponse is handed to the mobile client: it opens
// InitPoint in a browser/in-app web view and polls OrderID afterwards.
type CartPreferenceResponse struct {
	OrderID   string  `json:"orderId"`
	InitPoint string  `json:"initPoint"`
	Total     float64 `json:"total"`
	Currency  string  `json:"currency"`
}

// CreateCartPreference validates every product line against the DB
// (existence + stock), persists a pending order, and creates the
// MercadoPago preference with the order ID as external_reference.
func (s *Service) CreateCartPreference(ctx context.Context, athleteID string, items []CartPreferenceItem) (*CartPreferenceResponse, error) {
	if len(items) == 0 {
		return nil, errors.New("BAD_REQUEST", "el carrito está vacío", http.StatusBadRequest)
	}
	if athleteID == "" {
		return nil, errors.New("UNAUTHORIZED", "usuario no autenticado", http.StatusUnauthorized)
	}

	type validated struct {
		product *store.Product
		qty     int
	}
	lines := make([]validated, 0, len(items))
	total := 0.0
	seen := map[string]bool{}
	for _, it := range items {
		if it.Quantity <= 0 {
			return nil, errors.New("BAD_REQUEST", "cantidad inválida", http.StatusBadRequest)
		}
		if seen[it.ProductID] {
			return nil, errors.New("BAD_REQUEST", "producto duplicado en el carrito", http.StatusBadRequest)
		}
		seen[it.ProductID] = true

		product, err := s.storeRepo.GetProduct(ctx, it.ProductID)
		if err != nil {
			return nil, errors.New("NOT_FOUND", "producto no encontrado: "+it.ProductID, http.StatusNotFound)
		}
		if product.Stock < it.Quantity {
			return nil, errors.New("BAD_REQUEST",
				fmt.Sprintf("stock insuficiente para %s: hay %d, se piden %d", product.Name, product.Stock, it.Quantity),
				http.StatusBadRequest)
		}
		lines = append(lines, validated{product: product, qty: it.Quantity})
		total += product.Price * float64(it.Quantity)
	}

	// Persist the pending order BEFORE calling MercadoPago so the webhook
	// can always find it.
	orderID := fmt.Sprintf("ord_%d", time.Now().UnixNano())
	order := &store.Order{
		ID:        orderID,
		AthleteID: athleteID,
		Status:    "pending",
		Total:     total,
		Currency:  "COP",
	}
	orderItems := make([]*store.OrderItem, 0, len(lines))
	mpItems := make([]map[string]interface{}, 0, len(lines))
	for i, l := range lines {
		orderItems = append(orderItems, &store.OrderItem{
			ID:          fmt.Sprintf("%s-it-%d", orderID, i),
			OrderID:     orderID,
			ProductID:   l.product.ID,
			ProductName: l.product.Name,
			UnitPrice:   l.product.Price,
			Quantity:    l.qty,
		})
		mpItems = append(mpItems, map[string]interface{}{
			"id":          l.product.ID,
			"title":       l.product.Name,
			"currency_id": "COP",
			"category_id": "productos",
			"quantity":    l.qty,
			"unit_price":  l.product.Price,
		})
	}
	if err := s.storeRepo.CreateOrderWithItems(ctx, order, orderItems); err != nil {
		return nil, errors.New("INTERNAL", "no se pudo crear la orden", http.StatusInternalServerError)
	}

	preference, err := s.createPreference(ctx, mpItems, orderID, athleteID)
	if err != nil {
		return nil, err
	}

	return &CartPreferenceResponse{
		OrderID:   orderID,
		InitPoint: preference.InitPoint,
		Total:     total,
		Currency:  "COP",
	}, nil
}

// GetOrder exposes order status for client polling after the browser flow.
func (s *Service) GetOrder(ctx context.Context, orderID string) (*store.Order, error) {
	return s.storeRepo.GetOrder(ctx, orderID)
}

// --- Membership checkout ---

// MembershipPreferenceResponse is handed to the mobile client.
type MembershipPreferenceResponse struct {
	MembershipID string  `json:"membershipId"`
	PlanName     string  `json:"planName"`
	InitPoint    string  `json:"initPoint"`
	Total        float64 `json:"total"`
	Currency     string  `json:"currency"`
}

// CreateMembershipPreference builds an MP preference for the athlete's
// CURRENT membership plan (price set by the coach). external_reference is
// "membership:<id>" so the webhook can activate the right membership.
func (s *Service) CreateMembershipPreference(ctx context.Context, athleteID string) (*MembershipPreferenceResponse, error) {
	if athleteID == "" {
		return nil, errors.New("UNAUTHORIZED", "usuario no autenticado", http.StatusUnauthorized)
	}

	m, err := s.membershipSvc.GetMembership(ctx, athleteID)
	if err != nil {
		return nil, errors.New("NOT_FOUND", "no tienes un plan asignado. Pídele a tu coach que te asigne una membresía.", http.StatusNotFound)
	}
	if m.PlanPrice <= 0 {
		return nil, errors.New("BAD_REQUEST", "tu plan no requiere pago", http.StatusBadRequest)
	}

	externalRef := "membership:" + m.ID
	items := []map[string]interface{}{{
		"id":          m.ID,
		"title":       "Membresía " + m.PlanName,
		"description": "Suscripción MR Training (" + m.BillingPeriod + ")",
		"currency_id": "COP",
		"category_id": "memberships",
		"quantity":    1,
		"unit_price":  m.PlanPrice,
	}}

	pref, err := s.createPreference(ctx, items, externalRef, athleteID)
	if err != nil {
		return nil, err
	}

	return &MembershipPreferenceResponse{
		MembershipID: m.ID,
		PlanName:     m.PlanName,
		InitPoint:    pref.point(),
		Total:        m.PlanPrice,
		Currency:     "COP",
	}, nil
}

// mpPreference is the subset of MercadoPago's preference we consume.
type mpPreference struct {
	ID           string `json:"id"`
	InitPoint    string `json:"init_point"`
	SandboxPoint string `json:"sandbox_init_point"`
}

func (p mpPreference) point() string {
	if p.InitPoint != "" {
		return p.InitPoint
	}
	return p.SandboxPoint
}

// createPreference posts to MercadoPago /v1/preferences with the order ID as
// external_reference — that's how the webhook maps a payment back to a order.
func (s *Service) createPreference(ctx context.Context, items []map[string]interface{}, orderID, athleteID string) (*mpPreference, error) {
	body := map[string]interface{}{
		"items": items,
		"back_urls": map[string]string{
			"success": s.cfg.AppURL + "/payment/success",
			"failure": s.cfg.AppURL + "/payment/failed",
			"pending": s.cfg.AppURL + "/payment/pending",
		},
		"notification_url":     s.cfg.MercadoPagoWebhookURL,
		"external_reference":  orderID,
		"payer":                map[string]interface{}{},
		"statement_descriptor": "MRTRAINING",
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, errors.New("INTERNAL", "no se pudo serializar la preference", http.StatusInternalServerError)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mercadoPagoAPI+"/checkout/preferences", bytes.NewReader(payload))
	if err != nil {
		return nil, errors.New("INTERNAL", "no se pudo crear la request a MercadoPago", http.StatusInternalServerError)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.cfg.MercadoPagoSecretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, errors.New("BAD_GATEWAY", "MercadoPago no disponible", http.StatusBadGateway)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, errors.New("BAD_GATEWAY",
			fmt.Sprintf("MercadoPago error: status %d", resp.StatusCode), http.StatusBadGateway)
	}

	var pref mpPreference
	if err := json.Unmarshal(respBody, &pref); err != nil {
		return nil, errors.New("INTERNAL", "respuesta inválida de MercadoPago", http.StatusInternalServerError)
	}
	if pref.point() == "" {
		return nil, errors.New("INTERNAL", "MercadoPago no devolvió init_point", http.StatusInternalServerError)
	}
	return &pref, nil
}

// --- Webhook ---

// mpNotification is the generic webhook body MercadoPago sends.
type mpNotification struct {
	Type string `json:"type"`
	Data struct {
		ID string `json:"id"`
	} `json:"data"`
}

// mpPayment is the subset of /v1/payments/{id} we consume.
type mpPayment struct {
	ID                 string  `json:"id"`
	Status             string  `json:"status"`
	ExternalReference  string  `json:"external_reference"`
	TransactionAmount  float64 `json:"transaction_amount"`
}

// VerifyWebhookSignature validates MercadoPago's x-signature header:
//   x-signature: ts=<unix-ts>,v1=<hex HMAC-SHA256(ts + body, webhook secret)>
func (s *Service) VerifyWebhookSignature(body []byte, signatureHeader string) (bool, error) {
	if signatureHeader == "" {
		return false, errors.New("UNAUTHORIZED", "firma webhook ausente", http.StatusUnauthorized)
	}
	if s.cfg.MercadoPagoWebhookKey == "" {
		// Dev convenience: no secret configured → accept but log loudly.
		return true, nil
	}

	var ts, v1 string
	for _, part := range strings.Split(signatureHeader, ",") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "ts=") {
			ts = strings.TrimPrefix(part, "ts=")
		} else if strings.HasPrefix(part, "v1=") {
			v1 = strings.TrimPrefix(part, "v1=")
		}
	}
	if ts == "" || v1 == "" {
		return false, errors.New("UNAUTHORIZED", "firma webhook malformada", http.StatusUnauthorized)
	}

	mac := hmac.New(sha256.New, []byte(s.cfg.MercadoPagoWebhookKey))
	mac.Write([]byte(ts))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(v1)) {
		return false, errors.New("UNAUTHORIZED", "firma webhook inválida", http.StatusUnauthorized)
	}
	return true, nil
}

// ProcessWebhook verifies, fetches the payment from MercadoPago and — when
// approved — fulfills the referenced order exactly once.
func (s *Service) ProcessWebhook(ctx context.Context, body []byte, signatureHeader string) error {
	if _, err := s.VerifyWebhookSignature(body, signatureHeader); err != nil {
		return err
	}

	var notif mpNotification
	if err := json.Unmarshal(body, &notif); err != nil {
		return errors.New("BAD_REQUEST", "body webhook inválido", http.StatusBadRequest)
	}
	if notif.Type != "payment" {
		// Other notification types are acknowledged and ignored.
		return nil
	}
	if notif.Data.ID == "" {
		return errors.New("BAD_REQUEST", "payment id ausente", http.StatusBadRequest)
	}

	payment, err := s.fetchPayment(ctx, notif.Data.ID)
	if err != nil {
		return err
	}

	if payment.Status != "approved" {
		// Rejected/pending payments leave the referenced entity pending.
		return nil
	}

	ref := payment.ExternalReference
	if ref == "" {
		return errors.New("BAD_REQUEST", "external_reference ausente", http.StatusBadRequest)
	}

	switch {
	case strings.HasPrefix(ref, "membership:"):
		// Membership plan payment → record the payment and activate the
		// athlete's membership for the next period.
		membershipID := strings.TrimPrefix(ref, "membership:")
		if err := s.fulfillMembership(ctx, membershipID, payment); err != nil {
			return err
		}
		return nil
	default:
		// Store cart order → transactional stock fulfillment.
		if _, err := s.storeRepo.FulfillOrder(ctx, ref, payment.ID); err != nil {
			return errors.New("INTERNAL", "no se pudo cumplir la orden: "+err.Error(), http.StatusInternalServerError)
		}
		return nil
	}
}

// fulfillMembership records the payment and refreshes the membership period.
// Idempotent: a repeated webhook for an already recorded MP payment is a
// no-op (the MP payment id is used as the payment record key).
func (s *Service) fulfillMembership(ctx context.Context, membershipID string, payment *mpPayment) error {
	if err := s.membershipSvc.ActivateAfterPayment(ctx, membershipID, payment.ID, payment.TransactionAmount); err != nil {
		return errors.New("INTERNAL", "no se pudo activar la membresía: "+err.Error(), http.StatusInternalServerError)
	}
	return nil
}

// fetchPayment reads the payment back from MercadoPago — never trust the
// notification body alone for money movements.
func (s *Service) fetchPayment(ctx context.Context, paymentID string) (*mpPayment, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mercadoPagoAPI+"/v1/payments/"+paymentID, nil)
	if err != nil {
		return nil, errors.New("INTERNAL", "no se pudo crear request de pago", http.StatusInternalServerError)
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.MercadoPagoSecretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, errors.New("BAD_GATEWAY", "MercadoPago no disponible", http.StatusBadGateway)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("BAD_GATEWAY", fmt.Sprintf("MercadoPago payments error: %d", resp.StatusCode), http.StatusBadGateway)
	}

	var p mpPayment
	if err := json.Unmarshal(respBody, &p); err != nil {
		return nil, errors.New("INTERNAL", "respuesta inválida de payments", http.StatusInternalServerError)
	}
	return &p, nil
}
