package ally_catalog

import (
	"context"
)

// Repository defines persistence for the ally catalog.
type Repository interface {
	// ResolveAllyID returns the ally the given user owns or belongs to (as
	// owner or member). Used to scope every catalog mutation to one ally.
	ResolveAllyID(ctx context.Context, userID string) (string, error)

	// ListProducts returns every product of an ally (optionally active only).
	ListProducts(ctx context.Context, allyID string, activeOnly bool) ([]*AllyProduct, error)

	// GetProduct returns a product only when it belongs to allyID.
	GetProduct(ctx context.Context, allyID, productID string) (*AllyProduct, error)
	// GetProductByID returns a product by ID regardless of which ally owns it.
	GetProductByID(ctx context.Context, productID string) (*AllyProduct, error)

	// ResolveAllyIDByCoachID returns the ally owned by the given coach (owner_user_id).
	ResolveAllyIDByCoachID(ctx context.Context, coachID string) (string, error)

	// CreateProduct inserts a product for allyID.
	CreateProduct(ctx context.Context, in CreateProductInput) (*AllyProduct, error)

	// UpdateProduct updates a product only when it belongs to allyID.
	UpdateProduct(ctx context.Context, allyID, productID string, in UpdateProductInput) (*AllyProduct, error)

	// ListServices returns every service of an ally (optionally active only).
	ListServices(ctx context.Context, allyID string, activeOnly bool) ([]*AllyService, error)

	// GetService returns a service only when it belongs to allyID.
	GetService(ctx context.Context, allyID, serviceID string) (*AllyService, error)

	// CreateService inserts a service for allyID.
	CreateService(ctx context.Context, in CreateServiceInput) (*AllyService, error)

	// UpdateService updates a service only when it belongs to allyID.
	UpdateService(ctx context.Context, allyID, serviceID string, in UpdateServiceInput) (*AllyService, error)
}
