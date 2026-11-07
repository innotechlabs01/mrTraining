package payment

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/domain/store"
	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/subscription/wompi"
)

// Provider is the payment gateway port used by this service. It intentionally
// mirrors the subscription.PaymentProvider contract so the shared Wompi adapter
// can be injected without a second implementation.
type Provider interface {
	CreateCheckout(ctx context.Context, req subscription.CheckoutRequest) (*subscription.CheckoutResponse, error)
	VerifySignature(body []byte, signatureHeader string) error
	FetchPayment(ctx context.Context, paymentID string) (*subscription.ProviderPayment, error)
}

type Service struct {
	cfg           *config.Config
	storeRepo     store.Repository
	membershipSvc MembershipReader
	provider      Provider
}

// MembershipReader is the read side of the membership service the payment
// domain needs: current plan for the athlete + activation after approval.
type MembershipReader interface {
	GetMembership(ctx context.Context, athleteID string) (*membership.Membership, error)
	ActivateAfterPayment(ctx context.Context, athleteID string, paymentID string, amount float64) error
}

func NewService(cfg *config.Config, storeRepo store.Repository, membershipSvc MembershipReader, providers ...Provider) *Service {
	s := &Service{
		cfg:           cfg,
		storeRepo:     storeRepo,
		membershipSvc: membershipSvc,
	}
	if len(providers) > 0 && providers[0] != nil {
		s.provider = providers[0]
	} else {
		s.provider = wompi.NewAdapter(cfg)
	}
	return s
}

// --- Cart checkout ---

// CartPreferenceItem is one product line requested by the client.
type CartPreferenceItem struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

// CartPreferenceResponse is handed to the mobile client: it opens
// CheckoutURL in a browser/in-app web view and polls OrderID afterwards.
type CartPreferenceResponse struct {
	OrderID   string  `json:"orderId"`
	InitPoint string  `json:"initPoint"`
	Total     float64 `json:"total"`
	Currency  string  `json:"currency"`
}

// CreateCartPreference validates every product line against the DB
// (existence + stock), persists a pending order, and creates a Wompi
// payment link with the order ID as external reference.
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
	productNames := make([]string, 0, len(items))
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
		productNames = append(productNames, product.Name)
	}

	orderID := fmt.Sprintf("ord_%d", time.Now().UnixNano())
	order := &store.Order{
		ID:        orderID,
		AthleteID: athleteID,
		Status:    "pending",
		Total:     total,
		Currency:  "COP",
	}
	orderItems := make([]*store.OrderItem, 0, len(lines))
	for i, l := range lines {
		orderItems = append(orderItems, &store.OrderItem{
			ID:          fmt.Sprintf("%s-it-%d", orderID, i),
			OrderID:     orderID,
			ProductID:   l.product.ID,
			ProductName: l.product.Name,
			UnitPrice:   l.product.Price,
			Quantity:    l.qty,
		})
	}
	if err := s.storeRepo.CreateOrderWithItems(ctx, order, orderItems); err != nil {
		return nil, errors.New("INTERNAL", "no se pudo crear la orden", http.StatusInternalServerError)
	}

	description := "MR Training store order " + orderID
	if len(productNames) > 0 {
		description = strings.Join(productNames, ", ")
	}

	notifURL := s.cfg.WompiWebhookURL

	checkout, err := s.provider.CreateCheckout(ctx, subscription.CheckoutRequest{
		ExternalReference: orderID,
		Description:      description,
		Amount:           total,
		Currency:         "COP",
		SuccessURL:       s.cfg.AppURL + "/payment/success",
		FailureURL:       s.cfg.AppURL + "/payment/failed",
		PendingURL:       s.cfg.AppURL + "/payment/pending",
		NotificationURL:  notifURL,
	})
	if err != nil {
		return nil, errors.New("BAD_GATEWAY", "Wompi no disponible: "+err.Error(), http.StatusBadGateway)
	}
	if checkout == nil || checkout.CheckoutURL == "" {
		return nil, errors.New("INTERNAL", "Wompi no devolvió init_point", http.StatusInternalServerError)
	}

	return &CartPreferenceResponse{
		OrderID:   orderID,
		InitPoint: checkout.CheckoutURL,
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

// CreateMembershipPreference builds a Wompi payment link for the athlete's
// current membership plan (price set by the coach). external_reference is
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

	notifURL := s.cfg.WompiWebhookURL

	checkout, err := s.provider.CreateCheckout(ctx, subscription.CheckoutRequest{
		ExternalReference: externalRef,
		Description:      "Membresía " + m.PlanName,
		Amount:           m.PlanPrice,
		Currency:         "COP",
		SuccessURL:       s.cfg.AppURL + "/payment/success",
		FailureURL:       s.cfg.AppURL + "/payment/failed",
		PendingURL:       s.cfg.AppURL + "/payment/pending",
		NotificationURL:  notifURL,
	})
	if err != nil {
		return nil, errors.New("BAD_GATEWAY", "Wompi no disponible: "+err.Error(), http.StatusBadGateway)
	}
	if checkout == nil || checkout.CheckoutURL == "" {
		return nil, errors.New("INTERNAL", "Wompi no devolvió init_point", http.StatusInternalServerError)
	}

	return &MembershipPreferenceResponse{
		MembershipID: m.ID,
		PlanName:     m.PlanName,
		InitPoint:    checkout.CheckoutURL,
		Total:        m.PlanPrice,
		Currency:     "COP",
	}, nil
}

// --- Webhook ---

// paymentNotification supports both MercadoPago (historical) and Wompi
// notification shapes.
type paymentNotification struct {
	Type  string `json:"type"`
	Event string `json:"event"`
	Data  struct {
		ID          string `json:"id"`
		Transaction struct {
			ID string `json:"id"`
		} `json:"transaction"`
	} `json:"data"`
}

func parsePaymentNotification(body []byte) (*paymentNotification, error) {
	var n paymentNotification
	if err := json.Unmarshal(body, &n); err != nil {
		return nil, err
	}
	return &n, nil
}

// ProcessWebhook verifies, fetches the payment from Wompi and — when
// approved — fulfills the referenced order exactly once.
func (s *Service) ProcessWebhook(ctx context.Context, body []byte, signatureHeader string) error {
	if err := s.provider.VerifySignature(body, signatureHeader); err != nil {
		return errors.New("UNAUTHORIZED", "firma webhook inválida", http.StatusUnauthorized)
	}

	notif, err := parsePaymentNotification(body)
	if err != nil {
		return errors.New("BAD_REQUEST", "body webhook inválido", http.StatusBadRequest)
	}

	paymentID := notif.Data.ID
	if notif.Data.Transaction.ID != "" {
		paymentID = notif.Data.Transaction.ID
	}
	isPayment := notif.Type == "payment" || strings.HasPrefix(notif.Event, "transaction.") || paymentID != ""
	if !isPayment {
		return nil
	}
	if paymentID == "" {
		return errors.New("BAD_REQUEST", "payment id ausente", http.StatusBadRequest)
	}
	if notif.Data.ID == "" {
		notif.Data.ID = paymentID
	}

	payment, err := s.provider.FetchPayment(ctx, paymentID)
	if err != nil {
		return errors.New("BAD_GATEWAY", "Wompi no disponible: "+err.Error(), http.StatusBadGateway)
	}

	if payment.Status != "approved" {
		return nil
	}

	ref := payment.ExternalReference
	if ref == "" {
		return errors.New("BAD_REQUEST", "external_reference ausente", http.StatusBadRequest)
	}

	switch {
	case strings.HasPrefix(ref, "membership:"):
		membershipID := strings.TrimPrefix(ref, "membership:")
		if err := s.fulfillMembership(ctx, membershipID, payment); err != nil {
			return err
		}
		return nil
	default:
		if _, err := s.storeRepo.FulfillOrder(ctx, ref, payment.ID); err != nil {
			return errors.New("INTERNAL", "no se pudo cumplir la orden: "+err.Error(), http.StatusInternalServerError)
		}
		return nil
	}
}

// VerifyWebhookSignature remains available for compatibility; verification is
// now delegated to the Wompi provider.
func (s *Service) VerifyWebhookSignature(body []byte, signatureHeader string) (bool, error) {
	if err := s.provider.VerifySignature(body, signatureHeader); err != nil {
		return false, errors.New("UNAUTHORIZED", "firma webhook inválida", http.StatusUnauthorized)
	}
	return true, nil
}

// fulfillMembership records the payment and refreshes the membership period.
func (s *Service) fulfillMembership(ctx context.Context, membershipID string, payment *subscription.ProviderPayment) error {
	if err := s.membershipSvc.ActivateAfterPayment(ctx, membershipID, payment.ID, payment.TransactionAmount); err != nil {
		return errors.New("INTERNAL", "no se pudo activar la membresía: "+err.Error(), http.StatusInternalServerError)
	}
	return nil
}
