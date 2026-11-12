// Package subscription defines the persistence port for the Subscription
// aggregate. Repository interfaces live in the domain layer and are implemented
// in the infrastructure layer.
package subscription

import (
	"context"
	"time"
)

// Repository defines data access operations for Subscription aggregates.
// Implementations live in the infrastructure layer (e.g. PostgreSQL).
type Repository interface {
	// Save persists a subscription aggregate. Returns NotFound if the row is
	// missing on update, or a concurrency error on optimistic version conflict.
	Save(ctx context.Context, s *Subscription) error
	// FindByID returns a subscription by its id. Returns NotFound if missing.
	FindByID(ctx context.Context, id string) (*Subscription, error)
	// FindByAthlete returns the athlete's current subscription (most recent).
	FindByAthlete(ctx context.Context, athleteID string) (*Subscription, error)
	// FindByCoach returns all subscriptions for a coach's athletes.
	FindByCoach(ctx context.Context, coachID string) ([]*Subscription, error)
	// RecordPayment persists a payment linked to a subscription. Idempotent per
	// provider payment id: replayed calls are no-ops.
	RecordPayment(ctx context.Context, payment *Payment) error
	// GetPaymentByProviderID returns a payment by the provider's payment id.
	GetPaymentByProviderID(ctx context.Context, providerPaymentID string) (*Payment, error)
	// HasApprovedPayment reports whether an approved payment exists for the
	// subscription. The subscription row is created BEFORE the payer pays, so
	// its own status cannot be used to tell whether the money arrived.
	HasApprovedPayment(ctx context.Context, subscriptionID string) (bool, error)
}

// Payment records a payment collected through a payment provider for a
// subscription.
type Payment struct {
	ID                string
	SubscriptionID    string
	ProviderPaymentID string
	ExternalReference string
	Amount            float64
	Currency          string
	Status            string // pending | approved | rejected | refunded | charged_back
	PeriodStart       time.Time
	PeriodEnd         time.Time
	PaidAt            *time.Time
	CreatedAt         time.Time
}
