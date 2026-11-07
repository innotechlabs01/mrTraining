// Package subscription provides the application service layer for the
// subscription domain. It orchestrates business logic between HTTP handlers
// and the repository/payment-provider ports, keeping domain rules decoupled
// from transport concerns.
package subscription

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service orchestrates subscription use cases: subscribe, cancel, and webhook
// fulfillment. It depends only on interfaces (Repository, PaymentProvider,
// plan.Repository), making it testable with fakes.
type Service struct {
	cfg      *config.Config
	subRepo  subscription.Repository
	provider subscription.PaymentProvider
	planRepo plandomain.Repository
}

// NewService creates a new subscription application service.
func NewService(cfg *config.Config, subRepo subscription.Repository, provider subscription.PaymentProvider, planRepo plandomain.Repository) *Service {
	return &Service{cfg: cfg, subRepo: subRepo, provider: provider, planRepo: planRepo}
}

// SubscribeCommand is the input to the subscribe use case.
type SubscribeCommand struct {
	// AthleteID is the subscriber (authenticated user).
	AthleteID string
	// CoachID is the plan owner / tenant.
	CoachID string
	// PlanID is the plan being subscribed to.
	PlanID string
	// GracePeriodDays overrides the default grace period (default 5).
	GracePeriodDays int
}

// SubscribeResult is the outcome of the subscribe use case.
type SubscribeResult struct {
	Subscription *subscription.Subscription
	CheckoutURL  string
	Reference    string
}

// Subscribe creates a subscription for the athlete on the given plan, builds a
// checkout preference with the payment provider, and persists the aggregate.
// The returned CheckoutURL is where the client redirects the payer.
func (s *Service) Subscribe(ctx context.Context, cmd SubscribeCommand) (*SubscribeResult, error) {
	if cmd.AthleteID == "" {
		return nil, errors.BadRequest("athlete_id is required")
	}
	if cmd.CoachID == "" {
		return nil, errors.BadRequest("coach_id is required")
	}
	if cmd.PlanID == "" {
		return nil, errors.BadRequest("plan_id is required")
	}

	// Look up the plan to enforce the canonical price/currency/billing period.
	plan, err := s.planRepo.GetByID(ctx, cmd.PlanID)
	if err != nil {
		return nil, errors.NotFound("Plan", cmd.PlanID)
	}
	if !plan.IsActive {
		return nil, errors.BadRequest("plan is not active")
	}

	id := subscription.NewSubscriptionID()
	sub, err := subscription.NewSubscription(
		id, cmd.AthleteID, cmd.CoachID, cmd.PlanID, plan.Name, plan.Price,
		plan.Currency, plan.BillingPeriod, cmd.GracePeriodDays,
	)
	if err != nil {
		return nil, errors.BadRequest(err.Error())
	}

	checkout, err := s.provider.CreateCheckout(ctx, subscription.CheckoutRequest{
		ExternalReference: "subscription:" + id,
		Description:       "Suscripción " + plan.Name + " (" + plan.BillingPeriod + ")",
		Amount:            plan.Price,
		Currency:          plan.Currency,
		SuccessURL:        s.cfg.AppURL + "/payment/success",
		FailureURL:        s.cfg.AppURL + "/payment/failed",
		PendingURL:        s.cfg.AppURL + "/payment/pending",
		NotificationURL:   func() string {
			if s.cfg.WompiWebhookURL != "" {
				return s.cfg.WompiWebhookURL
			}
			return s.cfg.MercadoPagoWebhookURL
		}(),
		PayerEmail:        "",
	})
	if err != nil {
		return nil, errors.Internal("no se pudo crear la preferencia de pago: " + err.Error())
	}

	if err := s.subRepo.Save(ctx, sub); err != nil {
		return nil, fmt.Errorf("save subscription: %w", err)
	}

	// Publish domain events after successful persistence.
	for _, event := range sub.DomainEvents() {
		_ = event // events published by the transport layer / outbox
	}
	sub.ClearEvents()

	return &SubscribeResult{
		Subscription: sub,
		CheckoutURL:  checkout.CheckoutURL,
		Reference:    checkout.Reference,
	}, nil
}

// CancelCommand is the input to the cancel use case.
type CancelCommand struct {
	SubscriptionID string
	// CoachID is the authenticated coach (tenant) cancelling the subscription.
	CoachID string
}

// Cancel cancels a subscription. Only the owning coach may cancel.
func (s *Service) Cancel(ctx context.Context, cmd CancelCommand) error {
	if cmd.SubscriptionID == "" {
		return errors.BadRequest("subscription_id is required")
	}
	if cmd.CoachID == "" {
		return errors.BadRequest("coach_id is required")
	}

	sub, err := s.subRepo.FindByID(ctx, cmd.SubscriptionID)
	if err != nil {
		return err
	}
	if sub.CoachID != cmd.CoachID {
		return errors.Forbidden("you can only cancel subscriptions of your own athletes")
	}

	if err := sub.Cancel(); err != nil {
		return errors.BadRequest(err.Error())
	}

	if err := s.subRepo.Save(ctx, sub); err != nil {
		return fmt.Errorf("save subscription: %w", err)
	}
	return nil
}

// GetByAthlete returns the athlete's current subscription.
func (s *Service) GetByAthlete(ctx context.Context, athleteID string) (*subscription.Subscription, error) {
	return s.subRepo.FindByAthlete(ctx, athleteID)
}

// ListByCoach returns all subscriptions for a coach's athletes.
func (s *Service) ListByCoach(ctx context.Context, coachID string) ([]*subscription.Subscription, error) {
	return s.subRepo.FindByCoach(ctx, coachID)
}

// FulfillWebhook verifies a provider webhook, fetches the payment from the
// provider, and — when approved — records the payment and advances the
// subscription's billing period. Idempotent per provider payment id.
func (s *Service) FulfillWebhook(ctx context.Context, req subscription.WebhookRequest) error {
	if err := s.provider.VerifySignature(req.Body, req.SignatureHeader); err != nil {
		return err
	}

	// The notification payload carries the provider payment id. Parse it.
	notif, err := parseNotification(req.Body)
	if err != nil {
		return errors.BadRequest("invalid webhook body: " + err.Error())
	}

	paymentID := notif.Data.ID
	if notif.Data.Transaction.ID != "" {
		paymentID = notif.Data.Transaction.ID
	}
	isPayment := notif.Type == "payment" || notif.Event == "transaction.updated" || notif.Event == "transaction.created" || paymentID != ""
	if !isPayment {
		// Non-payment notifications are acknowledged and ignored.
		return nil
	}
	if paymentID == "" {
		return errors.BadRequest("provider payment id missing")
	}
	if notif.Data.ID == "" {
		notif.Data.ID = paymentID
	}

	// Never trust the notification body alone for money movements.
	payment, err := s.provider.FetchPayment(ctx, paymentID)
	if err != nil {
		return err
	}

	// Idempotency: has this provider payment already been recorded?
	if existing, err := s.subRepo.GetPaymentByProviderID(ctx, payment.ID); err == nil && existing != nil {
		return nil
	}

	if payment.Status != "approved" {
		// Rejected/pending payments leave the subscription unchanged.
		return nil
	}

	ref := payment.ExternalReference
	if ref == "" {
		return errors.BadRequest("external_reference missing")
	}
	subscriptionID, ok := trimSubscriptionRef(ref)
	if !ok {
		return errors.BadRequest("invalid external_reference: " + ref)
	}

	sub, err := s.subRepo.FindByID(ctx, subscriptionID)
	if err != nil {
		return err
	}

	periodStart := time.Now().UTC()
	if payment.DateApproved != nil {
		periodStart = *payment.DateApproved
	}
	periodEnd := subscription.ComputePeriodEnd(periodStart, sub.BillingPeriod)

	p := &subscription.Payment{
		ID:                subscription.NewSubscriptionID(),
		SubscriptionID:    sub.ID,
		ProviderPaymentID: payment.ID,
		ExternalReference: ref,
		Amount:            payment.TransactionAmount,
		Currency:          payment.Currency,
		Status:            "approved",
		PeriodStart:       periodStart,
		PeriodEnd:         periodEnd,
		PaidAt:            payment.DateApproved,
		CreatedAt:         time.Now().UTC(),
	}
	if err := s.subRepo.RecordPayment(ctx, p); err != nil {
		return fmt.Errorf("record payment: %w", err)
	}

	if err := sub.ActivateAfterPayment(payment.ID, payment.TransactionAmount, periodStart, periodEnd); err != nil {
		return fmt.Errorf("activate subscription: %w", err)
	}

	if err := s.subRepo.Save(ctx, sub); err != nil {
		return fmt.Errorf("save subscription: %w", err)
	}
	return nil
}

// newSubscriptionID generates a unique subscription id.
func newSubscriptionID() string {
	return fmt.Sprintf("sub_%d", time.Now().UTC().UnixNano())
}

// --- notification parsing (internal) ---

type mpNotification struct {
	Type  string `json:"type"`
	Event string `json:"event"`
	Data  struct {
		ID          string `json:"id"`
		Transaction struct {
			ID string `json:"id"`
		} `json:"transaction"`
	} `json:"data"`
}

func parseNotification(body []byte) (*mpNotification, error) {
	var n mpNotification
	if err := unmarshalJSON(body, &n); err != nil {
		return nil, err
	}
	return &n, nil
}

// unmarshalJSON is a seam for tests to override JSON parsing.
var unmarshalJSON = json.Unmarshal

// trimSubscriptionRef strips the "subscription:" prefix and reports success.
func trimSubscriptionRef(ref string) (string, bool) {
	const prefix = "subscription:"
	if len(ref) <= len(prefix) {
		return "", false
	}
	if ref[:len(prefix)] != prefix {
		return "", false
	}
	id := ref[len(prefix):]
	if id == "" {
		return "", false
	}
	return id, true
}
