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
	checkoutdomain "github.com/innotechlabs01/mr-training-api/internal/domain/checkout"
	commissionentrydomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	paymentledgerdomain "github.com/innotechlabs01/mr-training-api/internal/domain/payment_ledger"
	paymentledgersvc "github.com/innotechlabs01/mr-training-api/internal/application/payment_ledger"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// CheckoutRecorder records a payment confirmed for a pending checkout (a
// checkout paid before the buyer registered).
type CheckoutRecorder interface {
	MarkPaid(ctx context.Context, checkoutID, providerPaymentID string, amount float64, currency string) error
}

// MetadataWriter mirrors the subscription entitlements into the auth
// provider's PUBLIC metadata, so the frontend can know what the user may see
// and do without a round trip to the database.
type MetadataWriter interface {
	MergePublicMetadata(ctx context.Context, userID string, patch map[string]interface{}) error
}

// Service orchestrates subscription use cases: subscribe, cancel, and webhook
// fulfillment. It depends only on interfaces (Repository, PaymentProvider,
// plan.Repository), making it testable with fakes.
type Service struct {
	cfg             *config.Config
	subRepo         subscription.Repository
	provider        subscription.PaymentProvider
	planRepo        plandomain.Repository
	ledgerSvc       *paymentledgersvc.Service
	commissionEntry commissionentrydomain.Repository
	metadata        MetadataWriter
	checkouts       CheckoutRecorder
}

// NewService creates a new subscription application service.
func NewService(cfg *config.Config, subRepo subscription.Repository, provider subscription.PaymentProvider, planRepo plandomain.Repository, ledgerSvc *paymentledgersvc.Service, commissionEntry commissionentrydomain.Repository) *Service {
	return &Service{cfg: cfg, subRepo: subRepo, provider: provider, planRepo: planRepo, ledgerSvc: ledgerSvc, commissionEntry: commissionEntry}
}

// WithMetadataWriter injects the auth-provider metadata writer used to mirror
// the plan entitlements.
func (s *Service) WithMetadataWriter(w MetadataWriter) *Service {
	s.metadata = w
	return s
}

// WithCheckoutRecorder injects the recorder for checkouts paid before the
// buyer registered.
func (s *Service) WithCheckoutRecorder(r CheckoutRecorder) *Service {
	s.checkouts = r
	return s
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
		TRM:               plan.TRM,
		// The payer comes back to the FRONTEND, not to this API. Building
		// these from APP_URL pointed at the Go API and every return URL
		// 404'd right after the payment.
		SuccessURL:        s.cfg.WebAppURL + "/payment/success",
		FailureURL:        s.cfg.WebAppURL + "/payment/failed",
		PendingURL:        s.cfg.WebAppURL + "/payment/pending",
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

	// Mirror the selected plan into the subscriber's public metadata so the
	// frontend knows what the user is on. The status stays "pending" until
	// the provider confirms the payment.
	s.mirrorEntitlements(ctx, cmd.AthleteID, plan.ID, plan.Name, "pending")

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

// AttachPaidCheckoutCommand describes the subscription to create for a checkout
// that was already paid for.
type AttachPaidCheckoutCommand struct {
	UserID    string
	CoachID   string
	PlanID    string
	PaymentID string
	Amount    float64
	Currency  string
	PaidAt    *time.Time
}

// AttachPaidCheckout creates the subscription for a checkout that was paid
// BEFORE the user registered, attaches the payment that was already made and
// activates it.
//
// It is the mirror of Subscribe: no new checkout is issued, because the payer
// already went through the provider.
func (s *Service) AttachPaidCheckout(ctx context.Context, cmd AttachPaidCheckoutCommand) (*subscription.Subscription, error) {
	if cmd.UserID == "" {
		return nil, errors.BadRequest("user_id is required")
	}
	if cmd.PaymentID == "" {
		return nil, errors.BadRequest("payment_id is required")
	}

	plan, err := s.planRepo.GetByID(ctx, cmd.PlanID)
	if err != nil {
		return nil, errors.NotFound("Plan", cmd.PlanID)
	}
	if !plan.IsActive {
		return nil, errors.BadRequest("plan is not active")
	}

	// Idempotency: the provider payment id is unique, so a claim that already
	// attached the payment must reuse that subscription instead of creating a
	// second one.
	if existing, err := s.subRepo.GetPaymentByProviderID(ctx, cmd.PaymentID); err == nil && existing != nil {
		if sub, ferr := s.subRepo.FindByID(ctx, existing.SubscriptionID); ferr == nil && sub != nil {
			s.mirrorEntitlements(ctx, cmd.UserID, sub.PlanID, sub.PlanName, "active")
			return sub, nil
		}
	}

	coachID := cmd.CoachID
	if coachID == "" {
		coachID = cmd.UserID
	}

	id := subscription.NewSubscriptionID()
	sub, err := subscription.NewSubscription(
		id, cmd.UserID, coachID, plan.ID, plan.Name, plan.Price,
		plan.Currency, plan.BillingPeriod, 5,
	)
	if err != nil {
		return nil, errors.BadRequest(err.Error())
	}

	periodStart := time.Now().UTC()
	if cmd.PaidAt != nil {
		periodStart = *cmd.PaidAt
	}
	periodEnd := subscription.ComputePeriodEnd(periodStart, plan.BillingPeriod)

	amount := cmd.Amount
	if amount <= 0 {
		amount = plan.Price
	}
	currency := cmd.Currency
	if currency == "" {
		currency = plan.Currency
	}

	// The payment references the subscription, so the row must exist first.
	if err := s.subRepo.Save(ctx, sub); err != nil {
		return nil, fmt.Errorf("save subscription: %w", err)
	}

	payment := &subscription.Payment{
		ID:                subscription.NewSubscriptionID(),
		SubscriptionID:    sub.ID,
		ProviderPaymentID: cmd.PaymentID,
		ExternalReference: "subscription:" + sub.ID,
		Amount:            amount,
		Currency:          currency,
		Status:            "approved",
		PeriodStart:       periodStart,
		PeriodEnd:         periodEnd,
		PaidAt:            cmd.PaidAt,
		CreatedAt:         time.Now().UTC(),
	}
	if err := s.subRepo.RecordPayment(ctx, payment); err != nil {
		return nil, fmt.Errorf("record payment: %w", err)
	}

	if err := sub.ActivateAfterPayment(payment.ID, payment.Amount, periodStart, periodEnd); err != nil {
		return nil, fmt.Errorf("activate subscription: %w", err)
	}
	if err := s.subRepo.Save(ctx, sub); err != nil {
		return nil, fmt.Errorf("save subscription: %w", err)
	}

	// The subscriber now owns the plan: mirror the entitlements.
	s.mirrorEntitlements(ctx, cmd.UserID, sub.PlanID, sub.PlanName, "active")

	return sub, nil
}

// mirrorEntitlements writes the plan entitlements into the auth provider's
// public metadata. It is best-effort: the subscription is already persisted,
// and the webhook can be replayed to sync the metadata again.
func (s *Service) mirrorEntitlements(ctx context.Context, userID, planID, planName, status string) {
	if s.metadata == nil || userID == "" {
		return
	}
	patch := map[string]interface{}{
		"plan":       planID,
		"planName":   planName,
		"planStatus": status,
	}
	_ = s.metadata.MergePublicMetadata(ctx, userID, patch)
}

// GetByAthlete returns the athlete's current subscription.
func (s *Service) GetByAthlete(ctx context.Context, athleteID string) (*subscription.Subscription, error) {
	return s.subRepo.FindByAthlete(ctx, athleteID)
}

// Payment status values returned by GetPaymentStatus.
const (
	// PaymentStatusNone means there is no subscription for the user yet.
	PaymentStatusNone = "none"
	// PaymentStatusPending means the subscription exists but no approved
	// payment has been recorded for it yet.
	PaymentStatusPending = "pending"
	// PaymentStatusApproved means the payment provider confirmed the payment.
	PaymentStatusApproved = "approved"
)

// GetPaymentStatus reports whether the payment for the given subscriber has
// been confirmed by the provider.
//
// The subscription row is created BEFORE the payer pays (the checkout needs
// it to attach the payment to), so the subscription status is always "active"
// from the start. The approved PAYMENT is the only trustworthy signal, and it
// is recorded by the provider webhook.
func (s *Service) GetPaymentStatus(ctx context.Context, subscriberID string) (string, *subscription.Subscription, error) {
	if subscriberID == "" {
		return PaymentStatusNone, nil, errors.BadRequest("subscriber_id is required")
	}

	sub, err := s.subRepo.FindByAthlete(ctx, subscriberID)
	if err != nil {
		return PaymentStatusNone, nil, err
	}
	if sub == nil {
		return PaymentStatusNone, nil, nil
	}

	approved, err := s.subRepo.HasApprovedPayment(ctx, sub.ID)
	if err != nil {
		return PaymentStatusNone, nil, err
	}
	if approved {
		return PaymentStatusApproved, sub, nil
	}
	return PaymentStatusPending, sub, nil
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

	// A checkout paid BEFORE the buyer registered: the payment is recorded on
	// the pending checkout and the claim creates the subscription later.
	if checkoutID, ok := checkoutdomain.ParseReference(ref); ok {
		if s.checkouts == nil {
			return nil
		}
		return s.checkouts.MarkPaid(ctx, checkoutID, payment.ID, payment.TransactionAmount, payment.Currency)
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

	// The payment is confirmed: the subscriber now has the plan. Mirror it
	// into the public metadata so the frontend can gate features without a
	// round trip to the database.
	s.mirrorEntitlements(ctx, sub.AthleteID, sub.PlanID, sub.PlanName, "active")

	// --- Record payment in ledger + commission entry for coach ---
	if s.ledgerSvc != nil && s.commissionEntry != nil && payment.Status == "approved" {
		periodStartStr := periodStart.Format("2006-01-02")
		periodEndStr := periodEnd.Format("2006-01-02")
		amountCents := int64(payment.TransactionAmount * 100)

		// Resolve commission term for the coach (platform fee + processing)
		term, termErr := s.ledgerSvc.GetActiveTerm(ctx, sub.CoachID, periodStartStr)
		_ = termErr

		// Record ledger entry (computes processing_fee, platform_commission, coach_net_payable)
		ledgerEntry, ledErr := s.ledgerSvc.RecordPayment(ctx, paymentledgerdomain.CreateLedgerEntryInput{
			WompiTransactionID: payment.ID,
			SourceType:         paymentledgerdomain.SourceTypeMembership,
			SubscriptionID:     sub.ID,
			AthleteID:          sub.AthleteID,
			CoachID:            sub.CoachID,
			GrossAmountCents:   amountCents,
			Currency:           payment.Currency,
			PeriodStart:        periodStartStr,
			PeriodEnd:          periodEndStr,
			Status:             paymentledgerdomain.StatusApproved,
			IdempotencyKey:     "sub_" + payment.ID,
		}, sub.CoachID)
		if ledErr != nil {
			// Ledger failure should not fail the webhook fulfillment; log and continue
			_ = ledErr
		} else if ledgerEntry != nil {
			// Create commission entry for the coach (net payable from platform)
			rateBps := int64(0)
			fixedFeeCents := int64(0)
			if term != nil {
				rateBps = term.RateBps
				fixedFeeCents = term.FixedFeeCents
			}

			_, cErr := s.commissionEntry.CreateCommissionEntryDirect(ctx, commissionentrydomain.CreateCommissionEntryInput{
				OperationID:        sub.ID,
				RelationshipID:     "", // subscriptions have no ally relationship
				CoachID:            sub.CoachID,
				AgreementID:        ledgerEntry.CommissionTermID,
				AgreementVersion:   ledgerEntry.CommissionTermVersion,
				BaseCents:          ledgerEntry.GrossAmountCents,
				RateBps:            rateBps,
				FixedAmountCents:   fixedFeeCents,
				AmountCents:        ledgerEntry.CoachNetPayableCents,
				Currency:           payment.Currency,
				ComputedAt:         time.Now().UTC().Format("2006-01-02 15:04:05"),
			}, sub.CoachID)
			if cErr != nil {
				_ = cErr
			}
		}
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
