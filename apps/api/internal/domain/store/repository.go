package store

import "context"

// Repository defines data access for the athlete store.
type Repository interface {
	ListProducts(ctx context.Context) ([]*Product, error)
	GetProduct(ctx context.Context, id string) (*Product, error)
	CreatePurchase(ctx context.Context, purchase *Purchase) error
	ListPurchasesByAthlete(ctx context.Context, athleteID string) ([]*Purchase, error)
}
