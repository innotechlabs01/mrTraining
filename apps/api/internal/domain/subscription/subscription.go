// Package subscription defines the Subscription aggregate and its repository
// and payment-provider ports. The Subscription is the consistency boundary for
// an athlete's recurring subscription to a coach's plan. All state transitions
// go through methods on the aggregate root, which enforce invariants and raise
// domain events consumed by the application layer.
package subscription

import (
	"errors"
	"fmt"
	"time"
)

// DomainEvent records a significant state transition within a Subscription
// aggregate. Events are immutable and published by the application layer after
// the enclosing transaction commits.
type DomainEvent interface {
	EventName() string
	AggregateID() string
	OccurredAt() time.Time
}

// Status is the lifecycle status of a subscription.
type Status string

const (
	StatusActive    Status = "active"
	StatusTrial     Status = "trial"
	StatusPastDue   Status = "past_due"
	StatusCancelled Status = "cancelled"
	StatusExpired   Status = "expired"
)

// ErrAlreadyCancelled is returned when cancelling an already cancelled subscription.
var ErrAlreadyCancelled = errors.New("subscription is already cancelled")

// ErrNotCancelled is returned when operating on a subscription that is not cancelled.
var ErrNotCancelled = errors.New("subscription is not cancelled")

// ErrAlreadyActive is returned when activating an already active subscription.
var ErrAlreadyActive = errors.New("subscription is already active")

// Subscription is the aggregate root for an athlete's recurring subscription
// to a coach's plan. External code references only the root and mutates state
// through its methods, never by setting fields directly.
type Subscription struct {
	ID                 string
	AthleteID          string
	CoachID            string
	PlanID             string
	PlanName           string
	PlanPrice          float64
	Currency           string
	BillingPeriod      string // "monthly" or "yearly"
	Status             Status
	CancelAtPeriodEnd  bool
	CanceledAt         *time.Time
	CurrentPeriodStart time.Time
	CurrentPeriodEnd   time.Time
	GracePeriodDays    int
	PaymentDueDate     time.Time
	Version            int
	CreatedAt          time.Time
	UpdatedAt          time.Time

	domainEvents []DomainEvent
}

// NewSubscription creates a new active subscription for the given athlete and
// plan. The first billing period is computed from now. Returns the aggregate
// with a SubscriptionCreated domain event raised.
func NewSubscription(id, athleteID, coachID, planID, planName string, planPrice float64, currency, billingPeriod string, gracePeriodDays int) (*Subscription, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete_id is required")
	}
	if coachID == "" {
		return nil, fmt.Errorf("coach_id is required")
	}
	if planID == "" {
		return nil, fmt.Errorf("plan_id is required")
	}
	if planPrice <= 0 {
		return nil, fmt.Errorf("plan_price must be greater than 0")
	}
	if currency == "" {
		currency = "COP"
	}
	if billingPeriod == "" {
		billingPeriod = "monthly"
	}
	if gracePeriodDays < 0 {
		gracePeriodDays = 5
	}

	now := time.Now().UTC()
	periodEnd := ComputePeriodEnd(now, billingPeriod)
	paymentDue := periodEnd.AddDate(0, 0, gracePeriodDays)

	s := &Subscription{
		ID:                 id,
		AthleteID:          athleteID,
		CoachID:            coachID,
		PlanID:             planID,
		PlanName:           planName,
		PlanPrice:          planPrice,
		Currency:           currency,
		BillingPeriod:      billingPeriod,
		Status:             StatusActive,
		CancelAtPeriodEnd:  false,
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   periodEnd,
		GracePeriodDays:    gracePeriodDays,
		PaymentDueDate:     paymentDue,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	s.raiseEvent(SubscriptionCreatedEvent{
		EventID:       newEventID(),
		aggregateID:   s.ID,
		AthleteID:     s.AthleteID,
		CoachID:       s.CoachID,
		PlanID:        s.PlanID,
		PlanPrice:     s.PlanPrice,
		Currency:      s.Currency,
		BillingPeriod: s.BillingPeriod,
		occurredAt:    now,
	})
	return s, nil
}

// Cancel marks the subscription to cancel at the end of the current period.
// It is idempotent: cancelling when already marked to cancel at period end
// returns ErrAlreadyCancelled.
func (s *Subscription) Cancel() error {
	if s.CancelAtPeriodEnd {
		return ErrAlreadyCancelled
	}
	s.CancelAtPeriodEnd = true
	now := time.Now().UTC()
	s.CanceledAt = &now
	s.UpdatedAt = now

	s.raiseEvent(SubscriptionCancelledEvent{
		EventID:     newEventID(),
		aggregateID: s.ID,
		AthleteID:   s.AthleteID,
		CoachID:     s.CoachID,
		PlanID:      s.PlanID,
		CanceledAt:  now,
		occurredAt:  now,
	})
	return nil
}

// Reactivate re-enables a cancelled subscription before the period ends.
// Returns ErrNotCancelled if the subscription is not marked to cancel at
// period end.
func (s *Subscription) Reactivate() error {
	if !s.CancelAtPeriodEnd {
		return ErrNotCancelled
	}
	s.CancelAtPeriodEnd = false
	s.CanceledAt = nil
	s.Status = StatusActive
	s.UpdatedAt = time.Now().UTC()

	s.raiseEvent(SubscriptionReactivatedEvent{
		EventID:       newEventID(),
		aggregateID:   s.ID,
		AthleteID:     s.AthleteID,
		CoachID:       s.CoachID,
		PlanID:        s.PlanID,
		ReactivatedAt: s.UpdatedAt,
		occurredAt:    s.UpdatedAt,
	})
	return nil
}

// ActivateAfterPayment records that a payment was approved and advances the
// subscription's billing period. This is the webhook fulfillment path. It is
// idempotent: callers must ensure the underlying payment has not already been
// recorded (checked via the provider payment id in the repository layer).
func (s *Subscription) ActivateAfterPayment(paymentID string, amount float64, periodStart, periodEnd time.Time) error {
	if paymentID == "" {
		return fmt.Errorf("payment_id is required")
	}
	if amount <= 0 {
		return fmt.Errorf("amount must be greater than 0")
	}
	if periodEnd.Before(periodStart) {
		return fmt.Errorf("period_end must not be before period_start")
	}

	now := time.Now().UTC()
	s.CurrentPeriodStart = periodStart
	s.CurrentPeriodEnd = periodEnd
	s.PaymentDueDate = periodEnd.AddDate(0, 0, s.GracePeriodDays)
	s.CancelAtPeriodEnd = false
	s.CanceledAt = nil
	s.Status = StatusActive
	s.UpdatedAt = now

	s.raiseEvent(SubscriptionPaidEvent{
		EventID:     newEventID(),
		aggregateID: s.ID,
		AthleteID:   s.AthleteID,
		CoachID:     s.CoachID,
		PlanID:      s.PlanID,
		PaymentID:   paymentID,
		Amount:      amount,
		Currency:    s.Currency,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		occurredAt:  now,
	})
	return nil
}

// RecalculateStatus refreshes the status field based on the current date and
// period/due dates. Cancelled subscriptions are never auto-updated.
func (s *Subscription) RecalculateStatus() {
	if s.Status == StatusCancelled {
		return
	}

	now := time.Now().UTC().Truncate(24 * time.Hour)

	if !now.After(s.CurrentPeriodEnd) {
		s.Status = StatusActive
		return
	}
	if !now.After(s.PaymentDueDate) {
		s.Status = StatusPastDue
		return
	}
	s.Status = StatusExpired
}

// DomainEvents returns the pending domain events raised by this aggregate.
func (s *Subscription) DomainEvents() []DomainEvent {
	return s.domainEvents
}

// ClearEvents removes all pending domain events after they have been published.
func (s *Subscription) ClearEvents() {
	s.domainEvents = nil
}

func (s *Subscription) raiseEvent(e DomainEvent) {
	s.domainEvents = append(s.domainEvents, e)
}

// ComputePeriodEnd returns the end of a billing period starting at t.
func ComputePeriodEnd(start time.Time, billingPeriod string) time.Time {
	if billingPeriod == "yearly" {
		return start.AddDate(1, 0, 0)
	}
	return start.AddDate(0, 1, 0)
}

// NewSubscriptionID generates a unique subscription id.
func NewSubscriptionID() string {
	return fmt.Sprintf("sub_%d", time.Now().UTC().UnixNano())
}

// newEventID generates a unique domain event id.
func newEventID() string {
	return fmt.Sprintf("evt_%d", time.Now().UTC().UnixNano())
}

// --- Domain events ---

// SubscriptionCreated is raised when a new subscription is created.
type SubscriptionCreatedEvent struct {
	EventID       string
	aggregateID   string
	AthleteID     string
	CoachID       string
	PlanID        string
	PlanPrice     float64
	Currency      string
	BillingPeriod string
	occurredAt    time.Time
}

func (e SubscriptionCreatedEvent) EventName() string     { return "subscription.created" }
func (e SubscriptionCreatedEvent) AggregateID() string   { return e.aggregateID }
func (e SubscriptionCreatedEvent) OccurredAt() time.Time { return e.occurredAt }

// SubscriptionCancelled is raised when a subscription is cancelled.
type SubscriptionCancelledEvent struct {
	EventID     string
	aggregateID string
	AthleteID   string
	CoachID     string
	PlanID      string
	CanceledAt  time.Time
	occurredAt  time.Time
}

func (e SubscriptionCancelledEvent) EventName() string     { return "subscription.cancelled" }
func (e SubscriptionCancelledEvent) AggregateID() string   { return e.aggregateID }
func (e SubscriptionCancelledEvent) OccurredAt() time.Time { return e.occurredAt }

// SubscriptionReactivated is raised when a cancelled subscription is reactivated.
type SubscriptionReactivatedEvent struct {
	EventID       string
	aggregateID   string
	AthleteID     string
	CoachID       string
	PlanID        string
	ReactivatedAt time.Time
	occurredAt    time.Time
}

func (e SubscriptionReactivatedEvent) EventName() string     { return "subscription.reactivated" }
func (e SubscriptionReactivatedEvent) AggregateID() string   { return e.aggregateID }
func (e SubscriptionReactivatedEvent) OccurredAt() time.Time { return e.occurredAt }

// SubscriptionPaid is raised when a subscription payment is approved and the period advances.
type SubscriptionPaidEvent struct {
	EventID     string
	aggregateID string
	AthleteID   string
	CoachID     string
	PlanID      string
	PaymentID   string
	Amount      float64
	Currency    string
	PeriodStart time.Time
	PeriodEnd   time.Time
	occurredAt  time.Time
}

func (e SubscriptionPaidEvent) EventName() string     { return "subscription.paid" }
func (e SubscriptionPaidEvent) AggregateID() string   { return e.aggregateID }
func (e SubscriptionPaidEvent) OccurredAt() time.Time { return e.occurredAt }
