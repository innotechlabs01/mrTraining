package workers

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"

	commissionentrydomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	paymentledgerdomain "github.com/innotechlabs01/mr-training-api/internal/domain/payment_ledger"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
	"github.com/innotechlabs01/mr-training-api/pkg/telemetry"
)

// BillingConsumer processes asynchronous payment ledger, commission accrual,
// and pending-checkout payment transitions.
type BillingConsumer struct {
	deps WorkerDeps
	log  *zap.Logger
}

// NewBillingConsumer builds a BillingConsumer.
func NewBillingConsumer(deps WorkerDeps, log *zap.Logger) *BillingConsumer {
	if log == nil {
		log = zap.NewNop()
	}
	return &BillingConsumer{deps: deps, log: log}
}

// HandlePaymentApproved records the approved payment in the ledger and accrues
// the coach commission idempotently.
func (c *BillingConsumer) HandlePaymentApproved(ctx context.Context, ev eventbus.DomainEvent) error {
	if c.deps.Ledger == nil {
		return nil
	}
	subID := strField(ev.Payload, "subscription_id", ev.AggregateID)
	paymentID := strField(ev.Payload, "provider_payment_id", "")
	coachID := strField(ev.Payload, "coach_id", ev.CoachID)
	athleteID := strField(ev.Payload, "athlete_id", ev.AthleteID)
	currency := strField(ev.Payload, "currency", "COP")
	periodStart := strField(ev.Payload, "period_start", time.Now().UTC().Format("2006-01-02"))
	periodEnd := strField(ev.Payload, "period_end", time.Now().UTC().AddDate(0, 1, 0).Format("2006-01-02"))
	grossCents := int64Field(ev.Payload, "gross_amount_cents")

	if paymentID == "" || subID == "" || coachID == "" {
		return resilience.MarkNonRetryable(errors.New("billing payment.approved missing required fields"))
	}
	if athleteID == "" {
		athleteID = coachID
	}

	term, _ := c.deps.Ledger.GetActiveTerm(ctx, coachID, periodStart)
	entry, err := c.deps.Ledger.RecordPayment(ctx, paymentledgerdomain.CreateLedgerEntryInput{
		WompiTransactionID: paymentID,
		SourceType:         paymentledgerdomain.SourceTypeMembership,
		SubscriptionID:     subID,
		AthleteID:          athleteID,
		CoachID:            coachID,
		GrossAmountCents:   grossCents,
		Currency:           currency,
		PeriodStart:        periodStart,
		PeriodEnd:          periodEnd,
		Status:             paymentledgerdomain.StatusApproved,
		IdempotencyKey:     "sub_" + paymentID,
	}, coachID)
	if err != nil {
		return fmt.Errorf("billing record ledger payment: %w", err)
	}

	if c.deps.Commission != nil && entry != nil {
		var rateBps, fixedCents int64
		if term != nil {
			rateBps = term.RateBps
			fixedCents = term.FixedFeeCents
		}
		if _, cerr := c.deps.Commission.CreateCommissionEntryDirect(ctx, commissionentrydomain.CreateCommissionEntryInput{
			OperationID:      subID,
			RelationshipID:   "",
			CoachID:          coachID,
			AgreementID:      entry.CommissionTermID,
			AgreementVersion: entry.CommissionTermVersion,
			BaseCents:        entry.GrossAmountCents,
			RateBps:          rateBps,
			FixedAmountCents: fixedCents,
			AmountCents:      entry.CoachNetPayableCents,
			Currency:         currency,
			ComputedAt:       time.Now().UTC().Format("2006-01-02 15:04:05"),
		}, coachID); cerr != nil {
			return fmt.Errorf("billing create commission entry: %w", cerr)
		}
	}

	c.log.Info("billing projection recorded", append(telemetry.ZapFields(ctx),
		zap.String("subscription_id", subID),
		zap.String("provider_payment_id", paymentID),
	)...)
	return nil
}

// HandleCheckoutPaid marks an unregistered-buyer pending checkout as paid.
func (c *BillingConsumer) HandleCheckoutPaid(ctx context.Context, ev eventbus.DomainEvent) error {
	if c.deps.Checkouts == nil {
		return nil
	}
	checkoutID := strField(ev.Payload, "checkout_id", ev.AggregateID)
	paymentID := strField(ev.Payload, "provider_payment_id", "")
	currency := strField(ev.Payload, "currency", "COP")
	amount := float64Field(ev.Payload, "amount")
	if checkoutID == "" || paymentID == "" {
		return resilience.MarkNonRetryable(errors.New("checkout.paid missing checkout_id or provider_payment_id"))
	}
	return c.deps.Checkouts.MarkPaid(ctx, checkoutID, paymentID, amount, currency)
}

// HandleCheckoutFailed marks an unregistered-buyer pending checkout as failed.
func (c *BillingConsumer) HandleCheckoutFailed(ctx context.Context, ev eventbus.DomainEvent) error {
	if c.deps.Checkouts == nil {
		return nil
	}
	checkoutID := strField(ev.Payload, "checkout_id", ev.AggregateID)
	paymentID := strField(ev.Payload, "provider_payment_id", "")
	if checkoutID == "" {
		return resilience.MarkNonRetryable(errors.New("checkout.failed missing checkout_id"))
	}
	return c.deps.Checkouts.MarkFailed(ctx, checkoutID, paymentID)
}

func strField(m map[string]interface{}, key, fallback string) string {
	if m == nil {
		return fallback
	}
	if v, ok := m[key].(string); ok && v != "" {
		return v
	}
	return fallback
}

func int64Field(m map[string]interface{}, key string) int64 {
	if m == nil {
		return 0
	}
	switch v := m[key].(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	default:
		return 0
	}
}

func float64Field(m map[string]interface{}, key string) float64 {
	if m == nil {
		return 0
	}
	switch v := m[key].(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int64:
		return float64(v)
	case int:
		return float64(v)
	default:
		return 0
	}
}
