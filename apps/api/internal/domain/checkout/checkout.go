// Package checkout defines the pending checkout aggregate: a plan that was
// chosen and paid for BEFORE the buyer created an account.
//
// The payment provider issues a link with sku "checkout:<id>". The webhook
// records the payment here, and the claim (once the buyer registers) creates
// the subscription and attaches the payment.
package checkout

import (
	"context"
	"fmt"
	"strings"
)

// Checkout statuses.
const (
	// StatusCreated means the payment link was issued but not paid yet.
	StatusCreated = "created"
	// StatusPaid means the provider confirmed the payment and the checkout is
	// waiting for the buyer to register.
	StatusPaid = "paid"
	// StatusClaimed means a user attached the checkout to their account.
	StatusClaimed = "claimed"
	// StatusFailed means the payment was rejected.
	StatusFailed = "failed"
)

// Checkout is a plan chosen by a buyer who has not registered yet.
type Checkout struct {
	ID     string
	Email  string
	PlanID string
	// PlanName is denormalized so the claim can mirror it into the metadata
	// without reading the plan table again.
	PlanName string
	Amount   float64
	Currency string
	// ProviderReference is the provider's checkout id (the Wompi payment link).
	ProviderReference string
	// ProviderPaymentID is the transaction id, filled when the webhook lands.
	ProviderPaymentID string
	Status            string
	// UserID is set by the claim.
	UserID string
	// CoachCode is the coach code handed to the claimed user.
	CoachCode string
	CreatedAt string
	UpdatedAt string
}

// ReferencePrefix is the sku prefix used for a checkout that has no owner yet.
const ReferencePrefix = "checkout:"

// Reference returns the provider reference for this checkout.
func (c *Checkout) Reference() string {
	return ReferencePrefix + c.ID
}

// ParseReference extracts the checkout id from a provider reference.
// It reports false when the reference belongs to another kind of purchase.
func ParseReference(reference string) (string, bool) {
	if !strings.HasPrefix(reference, ReferencePrefix) {
		return "", false
	}
	id := strings.TrimPrefix(reference, ReferencePrefix)
	if id == "" {
		return "", false
	}
	return id, true
}

// IsPaid reports whether the provider confirmed the payment.
func (c *Checkout) IsPaid() bool {
	return c.Status == StatusPaid || c.Status == StatusClaimed
}

// MarkPaid records the confirmed payment.
func (c *Checkout) MarkPaid(providerPaymentID string, amount float64, currency string) error {
	if providerPaymentID == "" {
		return fmt.Errorf("provider payment id is required")
	}
	c.ProviderPaymentID = providerPaymentID
	if amount > 0 {
		c.Amount = amount
	}
	if currency != "" {
		c.Currency = currency
	}
	c.Status = StatusPaid
	return nil
}

// MarkClaimed attaches the checkout to a user.
func (c *Checkout) MarkClaimed(userID, coachCode string) error {
	if userID == "" {
		return fmt.Errorf("user id is required")
	}
	if c.Status != StatusPaid {
		return fmt.Errorf("checkout is not paid")
	}
	c.UserID = userID
	c.CoachCode = coachCode
	c.Status = StatusClaimed
	return nil
}

// Repository is the persistence port for pending checkouts.
type Repository interface {
	// Create inserts a pending checkout.
	Create(ctx context.Context, c *Checkout) error
	// GetByID returns a checkout by id. Returns ErrNotFound when missing.
	GetByID(ctx context.Context, id string) (*Checkout, error)
	// GetLatestByEmail returns the most recent checkout for an email, so a
	// buyer who never registered can recover their paid checkout.
	GetLatestByEmail(ctx context.Context, email string) (*Checkout, error)
	// Save persists the changes of a checkout.
	Save(ctx context.Context, c *Checkout) error
}
