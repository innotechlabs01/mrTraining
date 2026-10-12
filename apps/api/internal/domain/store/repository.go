package store

import "context"

// Repository defines data access for the athlete store.
type Repository interface {
	ListProducts(ctx context.Context) ([]*Product, error)
	GetProduct(ctx context.Context, id string) (*Product, error)
	CreatePurchase(ctx context.Context, purchase *Purchase) error
	ListPurchasesByAthlete(ctx context.Context, athleteID string) ([]*Purchase, error)
	ListPurchases(ctx context.Context) ([]*Purchase, error)

	// Cart checkout with payment confirmation.
	CreateOrderWithItems(ctx context.Context, order *Order, items []*OrderItem) error
	GetOrder(ctx context.Context, orderID string) (*Order, error)
	GetOrderItems(ctx context.Context, orderID string) ([]*OrderItem, error)
	// FulfillOrder validates stock for every item, records the purchases and
	// decrements stock atomically in one transaction. Idempotent per order.
	FulfillOrder(ctx context.Context, orderID, externalRef string) (*Order, error)
}
