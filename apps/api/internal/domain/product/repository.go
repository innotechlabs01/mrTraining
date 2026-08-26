package product

import "context"

// Repository defines the data access interface for the product domain.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type Repository interface {
	// ListByCoach retrieves all products for a given coach, ordered by name.
	// Returns an empty slice (not nil) if no products exist.
	ListByCoach(ctx context.Context, coachID string) ([]*Product, error)

	// GetByID retrieves a product by its unique identifier.
	// Returns ErrNotFound if no product exists with the given ID.
	GetByID(ctx context.Context, id string) (*Product, error)

	// Create inserts a new product record.
	Create(ctx context.Context, product *Product) error

	// Update modifies an existing product record.
	// Returns ErrNotFound if the product does not exist.
	Update(ctx context.Context, product *Product) error

	// Delete removes a product record by ID.
	// Returns ErrNotFound if the product does not exist.
	Delete(ctx context.Context, id string) error

	// UpdateStock adjusts the stock of a product by the given delta.
	// Returns ErrNotFound if the product does not exist.
	UpdateStock(ctx context.Context, id string, delta int) error

	// ListSalesByCoach retrieves all sales for a given coach, ordered by date descending.
	// Returns an empty slice (not nil) if no sales exist.
	ListSalesByCoach(ctx context.Context, coachID string) ([]*Sale, error)

	// CreateSale inserts a new sale record and decrements product stock.
	CreateSale(ctx context.Context, sale *Sale) error
}
