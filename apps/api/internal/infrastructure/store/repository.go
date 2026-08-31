package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/store"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements store.Repository using database/sql with libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new store repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ListProducts retrieves all products ordered by name.
func (r *Repository) ListProducts(ctx context.Context) ([]*store.Product, error) {
	if r.db == nil {
		return []*store.Product{}, nil
	}
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, price FROM products ORDER BY name`)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return []*store.Product{}, nil
		}
		return nil, fmt.Errorf("failed to list products: %w", err)
	}
	defer rows.Close()

	var products []*store.Product
	for rows.Next() {
		var p store.Product
		var price sql.NullFloat64
		var name sql.NullString
		if err := rows.Scan(&p.ID, &name, &price); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		if name.Valid {
			p.Name = name.String
		}
		if price.Valid {
			p.Price = price.Float64
		}
		products = append(products, &p)
	}
	if products == nil {
		products = []*store.Product{}
	}
	return products, nil
}

// GetProduct retrieves a product by ID.
func (r *Repository) GetProduct(ctx context.Context, id string) (*store.Product, error) {
	if r.db == nil {
		return nil, errors.NotFound("Product", id)
	}
	row := r.db.QueryRowContext(ctx, `SELECT id, name, price FROM products WHERE id = ?`, id)
	var p store.Product
	var name sql.NullString
	var price sql.NullFloat64
	err := row.Scan(&p.ID, &name, &price)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NotFound("Product", id)
		}
		if strings.Contains(err.Error(), "no such table") {
			return nil, errors.NotFound("Product", id)
		}
		return nil, fmt.Errorf("failed to get product: %w", err)
	}
	if name.Valid {
		p.Name = name.String
	}
	if price.Valid {
		p.Price = price.Float64
	}
	return &p, nil
}

// CreatePurchase inserts a purchase record. Handles missing table gracefully.
func (r *Repository) CreatePurchase(ctx context.Context, purchase *store.Purchase) error {
	if r.db == nil {
		return nil
	}
	// Try store_purchases first, then athlete_purchases as fallback.
	tables := []string{"store_purchases", "athlete_purchases"}
	var lastErr error
	for _, table := range tables {
		query := fmt.Sprintf(`INSERT INTO %s (id, athlete_id, product_id, quantity, price, created_at) VALUES (?, ?, ?, ?, ?, ?)`, table)
		_, err := r.db.ExecContext(ctx, query, purchase.ID, purchase.AthleteID, purchase.ProductID, purchase.Quantity, purchase.Price, purchase.CreatedAt)
		if err == nil {
			return nil
		}
		if strings.Contains(err.Error(), "no such table") {
			lastErr = err
			continue
		}
		return fmt.Errorf("failed to create purchase: %w", err)
	}
	// If both tables missing, return nil but don't fail per spec.
	if lastErr != nil && strings.Contains(lastErr.Error(), "no such table") {
		return nil
	}
	return nil
}

// ListPurchasesByAthlete retrieves purchases for a given athlete.
func (r *Repository) ListPurchasesByAthlete(ctx context.Context, athleteID string) ([]*store.Purchase, error) {
	if r.db == nil {
		return []*store.Purchase{}, nil
	}
	tables := []string{"store_purchases", "athlete_purchases"}
	for _, table := range tables {
		query := fmt.Sprintf(`SELECT id, athlete_id, product_id, quantity, price, created_at FROM %s WHERE athlete_id = ? ORDER BY created_at DESC`, table)
		rows, err := r.db.QueryContext(ctx, query, athleteID)
		if err != nil {
			if strings.Contains(err.Error(), "no such table") {
				continue
			}
			return nil, fmt.Errorf("failed to list purchases: %w", err)
		}
		defer rows.Close()

		var purchases []*store.Purchase
		for rows.Next() {
			var p store.Purchase
			var quantity sql.NullInt64
			var price sql.NullFloat64
			var createdAt sql.NullString
			if err := rows.Scan(&p.ID, &p.AthleteID, &p.ProductID, &quantity, &price, &createdAt); err != nil {
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
	return []*store.Purchase{}, nil
}
