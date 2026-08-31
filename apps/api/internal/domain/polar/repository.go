package polar

import (
	"context"
)

// Repository defines the persistence interface for Polar checkouts.
type Repository interface {
	CreateCheckout(ctx context.Context, c *PolarCheckout) error
	GetCheckout(ctx context.Context, id string) (*PolarCheckout, error)
	UpdateCheckoutStatus(ctx context.Context, id, status string) error
}