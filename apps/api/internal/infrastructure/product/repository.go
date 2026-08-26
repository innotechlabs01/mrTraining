package product

import (
	"context"
	"database/sql"
	"fmt"

	productdomain "github.com/innotechlabs01/mr-training-api/internal/domain/product"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements product.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new product repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ListByCoach retrieves all products for a given coach, ordered by name.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*productdomain.Product, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, brand, image_url, price, received, gross, stock, low_stock_threshold,
		 coach_id, created_at, updated_at
		 FROM products WHERE coach_id = ? ORDER BY name`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list products: %w", err)
	}
	defer rows.Close()

	var products []*productdomain.Product
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, p)
	}
	return products, nil
}

// GetByID retrieves a product by its unique identifier.
func (r *Repository) GetByID(ctx context.Context, id string) (*productdomain.Product, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, name, brand, image_url, price, received, gross, stock, low_stock_threshold,
		 coach_id, created_at, updated_at
		 FROM products WHERE id = ?`, id)

	p, err := scanProductRow(row)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// Create inserts a new product record.
func (r *Repository) Create(ctx context.Context, p *productdomain.Product) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO products (id, name, brand, image_url, price, received, gross, stock, low_stock_threshold, coach_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.Name, p.Brand, p.ImageURL, p.Price, p.Received, p.Gross,
		p.Stock, p.LowStockThreshold, p.CoachID)
	if err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}
	return nil
}

// Update modifies an existing product record.
func (r *Repository) Update(ctx context.Context, p *productdomain.Product) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE products SET name=?, brand=?, image_url=?, price=?, received=?, gross=?,
		 stock=?, low_stock_threshold=?, updated_at=datetime('now') WHERE id=?`,
		p.Name, p.Brand, p.ImageURL, p.Price, p.Received, p.Gross,
		p.Stock, p.LowStockThreshold, p.ID)
	if err != nil {
		return fmt.Errorf("failed to update product: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Product", p.ID)
	}
	return nil
}

// Delete removes a product record by ID.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM products WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete product: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Product", id)
	}
	return nil
}

// UpdateStock adjusts the stock of a product by the given delta.
func (r *Repository) UpdateStock(ctx context.Context, id string, delta int) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE products SET stock = MAX(0, stock + ?), updated_at = datetime('now') WHERE id = ?`,
		delta, id)
	if err != nil {
		return fmt.Errorf("failed to update stock: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Product", id)
	}
	return nil
}

// ListSalesByCoach retrieves all sales for a given coach, ordered by date descending.
func (r *Repository) ListSalesByCoach(ctx context.Context, coachID string) ([]*productdomain.Sale, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, product_id, product_name, brand, quantity, unit_price, unit_received,
		 total, date, coach_id, created_at
		 FROM sales WHERE coach_id = ? ORDER BY created_at DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list sales: %w", err)
	}
	defer rows.Close()

	var sales []*productdomain.Sale
	for rows.Next() {
		s, err := scanSale(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan sale: %w", err)
		}
		sales = append(sales, s)
	}
	return sales, nil
}

// CreateSale inserts a new sale record and decrements product stock.
func (r *Repository) CreateSale(ctx context.Context, sale *productdomain.Sale) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		sale.ID, sale.ProductID, sale.ProductName, sale.Brand, sale.Quantity,
		sale.UnitPrice, sale.UnitReceived, sale.Total, sale.Date, sale.CoachID)
	if err != nil {
		return fmt.Errorf("failed to create sale: %w", err)
	}

	// Decrement stock
	if _, err := r.db.ExecContext(ctx,
		`UPDATE products SET stock = MAX(0, stock - ?), updated_at = datetime('now') WHERE id = ?`,
		sale.Quantity, sale.ProductID); err != nil {
		return fmt.Errorf("failed to decrement stock: %w", err)
	}

	return nil
}

// --- Private helpers ---

type scannable interface {
	Scan(dest ...interface{}) error
}

func scanProductFromRow(s scannable) (*productdomain.Product, error) {
	p := &productdomain.Product{}
	err := s.Scan(&p.ID, &p.Name, &p.Brand, &p.ImageURL, &p.Price, &p.Received,
		&p.Gross, &p.Stock, &p.LowStockThreshold, &p.CoachID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func scanProductRow(row *sql.Row) (*productdomain.Product, error) {
	p, err := scanProductFromRow(row)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Product", "")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan product: %w", err)
	}
	return p, nil
}

func scanProduct(rows *sql.Rows) (*productdomain.Product, error) {
	return scanProductFromRow(rows)
}

func scanSaleFromRow(s scannable) (*productdomain.Sale, error) {
	sale := &productdomain.Sale{}
	var brand sql.NullString
	err := s.Scan(&sale.ID, &sale.ProductID, &sale.ProductName, &brand, &sale.Quantity,
		&sale.UnitPrice, &sale.UnitReceived, &sale.Total, &sale.Date, &sale.CoachID, &sale.CreatedAt)
	if err != nil {
		return nil, err
	}
	if brand.Valid {
		sale.Brand = brand.String
	}
	return sale, nil
}

func scanSaleRow(row *sql.Row) (*productdomain.Sale, error) {
	sale, err := scanSaleFromRow(row)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Sale", "")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan sale: %w", err)
	}
	return sale, nil
}

func scanSale(rows *sql.Rows) (*productdomain.Sale, error) {
	return scanSaleFromRow(rows)
}
