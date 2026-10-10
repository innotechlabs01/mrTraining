package store

import (
	"context"
	"fmt"
	"database/sql"

	"github.com/innotechlabs01/mr-training-api/internal/domain/store"
)

// Repository defines data access for the athlete store.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new store repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ListProducts returns all products available in the store.
func (r *Repository) ListProducts(ctx context.Context) ([]*store.Product, error) {
	if r.db == nil {
		return []*store.Product{}, nil
	}
	query := "SELECT id, name, description, price, image_url, stock, low_stock_threshold, created_at, updated_at FROM products WHERE is_shop = 1"
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list products: %w", err)
	}
	defer rows.Close()

	var products []*store.Product
	for rows.Next() {
		var p store.Product
		var imageURL sql.NullString
		var stock int
		var lowStockThreshold int
		var createdAt, updatedAt sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &imageURL, &stock, &lowStockThreshold, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		p.ImageURL = imageURL.String
		p.Stock = stock
		p.LowStockThreshold = lowStockThreshold
		p.CreatedAt = createdAt.String
		p.UpdatedAt = updatedAt.String
		products = append(products, &p)
	}
	if products == nil {
		products = []*store.Product{}
	}
	return products, nil
}

// GetProduct returns a product by ID.
func (r *Repository) GetProduct(ctx context.Context, id string) (*store.Product, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	query := "SELECT id, name, description, price, image_url, stock, low_stock_threshold, created_at, updated_at FROM products WHERE id = ? AND is_shop = 1"
	row := r.db.QueryRowContext(ctx, query, id)

	var p store.Product
	var imageURL sql.NullString
	var stock int
	var lowStockThreshold int
	var createdAt, updatedAt sql.NullString

	err := row.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &imageURL, &stock, &lowStockThreshold, &createdAt, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}

	p.ImageURL = imageURL.String
	p.Stock = stock
	p.LowStockThreshold = lowStockThreshold
	p.CreatedAt = createdAt.String
	p.UpdatedAt = updatedAt.String
	return &p, nil
}

// CreatePurchase creates a purchase for an athlete.
func (r *Repository) CreatePurchase(ctx context.Context, purchase *store.Purchase) error {
	if r.db == nil {
		return fmt.Errorf("database not initialized")
	}
	query := "INSERT INTO store_purchases (id, athlete_id, product_id, quantity, price, created_at) VALUES (?, ?, ?, ?, ?, ?)"
	_, err := r.db.ExecContext(ctx, query, purchase.ID, purchase.AthleteID, purchase.ProductID, purchase.Quantity, purchase.Price, purchase.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create purchase: %w", err)
	}

	// Update product stock
	productQuery := "UPDATE products SET stock = stock - ? WHERE id = ?"
	_, err = r.db.ExecContext(ctx, productQuery, purchase.Quantity, purchase.ProductID)
	if err != nil {
		return fmt.Errorf("failed to update product stock: %w", err)
	}

	return nil
}

// ListPurchasesByAthlete returns all purchases for a specific athlete.
func (r *Repository) ListPurchasesByAthlete(ctx context.Context, athleteID string) ([]*store.Purchase, error) {
	if r.db == nil {
		return []*store.Purchase{}, nil
	}
	query := "SELECT id, athlete_id, product_id, quantity, price, created_at FROM store_purchases WHERE athlete_id = ? ORDER BY created_at DESC"
	rows, err := r.db.QueryContext(ctx, query, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list purchases: %w", err)
	}
	defer rows.Close()

	var purchases []*store.Purchase
	for rows.Next() {
		var p store.Purchase
		
		var quantity int
		var price float64
		var createdAt string
		if err := rows.Scan(&p.ID, &p.AthleteID, &p.ProductID, &quantity, &price, &createdAt); err != nil {
			return nil, fmt.Errorf("failed to scan purchase: %w", err)
		}
		
		p.Quantity = quantity
		p.Price = price
		p.CreatedAt = createdAt
		purchases = append(purchases, &p)
	}
	if purchases == nil {
		purchases = []*store.Purchase{}
	}
	return purchases, nil
}

// ListPurchases returns all purchases in the system.
func (r *Repository) ListPurchases(ctx context.Context) ([]*store.Purchase, error) {
	if r.db == nil {
		return []*store.Purchase{}, nil
	}
	query := "SELECT id, athlete_id, product_id, quantity, price, created_at FROM store_purchases ORDER BY created_at DESC"
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list purchases: %w", err)
	}
	defer rows.Close()

	var purchases []*store.Purchase
	for rows.Next() {
		var p store.Purchase
		var athleteID string
		
		var quantity sql.NullInt64
		var price sql.NullFloat64
		var createdAt sql.NullString
		if err := rows.Scan(&p.ID, &athleteID, &p.ProductID, &quantity, &price, &createdAt); err != nil {
			return nil, fmt.Errorf("failed to scan purchase: %w", err)
		}
		if quantity.Valid {
			p.Quantity = int(quantity.Int64)
		}
		if price.Valid {
			p.Price = price.Float64
		}
		if createdAt.Valid {
			p.CreatedAt = createdAt.String
		}
		purchases = append(purchases, &p)
	}
	if purchases == nil {
		purchases = []*store.Purchase{}
	}
	return purchases, nil
}
