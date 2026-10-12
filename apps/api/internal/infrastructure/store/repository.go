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
func (r *Repository) ListPurchases(ctx context.Context) ([]*store.Purchase, error) {	if r.db == nil {
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

// --- Cart checkout orders ---

// CreateOrderWithItems persists a pending order and its items in one transaction.
func (r *Repository) CreateOrderWithItems(ctx context.Context, order *store.Order, items []*store.OrderItem) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin order tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO store_orders (id, athlete_id, status, total, currency, created_at)
		VALUES (?, ?, 'pending', ?, ?, datetime('now'))
	`, order.ID, order.AthleteID, order.Total, order.Currency); err != nil {
		return fmt.Errorf("failed to insert order: %w", err)
	}

	for _, it := range items {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO store_order_items (id, order_id, product_id, product_name, unit_price, quantity, fulfilled)
			VALUES (?, ?, ?, ?, ?, ?, 0)
		`, it.ID, order.ID, it.ProductID, it.ProductName, it.UnitPrice, it.Quantity); err != nil {
			return fmt.Errorf("failed to insert order item: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit order tx: %w", err)
	}
	return nil
}

// GetOrder returns an order by ID.
func (r *Repository) GetOrder(ctx context.Context, orderID string) (*store.Order, error) {
	var o store.Order
	var externalRef, paidAt sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, athlete_id, status, total, currency, external_ref, created_at, paid_at
		FROM store_orders WHERE id = ?
	`, orderID).Scan(&o.ID, &o.AthleteID, &o.Status, &o.Total, &o.Currency, &externalRef, &o.CreatedAt, &paidAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}
	o.ExternalRef = externalRef.String
	o.PaidAt = paidAt.String
	return &o, nil
}

// GetOrderItems returns the items of an order.
func (r *Repository) GetOrderItems(ctx context.Context, orderID string) ([]*store.OrderItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, order_id, product_id, product_name, unit_price, quantity, fulfilled
		FROM store_order_items WHERE order_id = ? ORDER BY product_name
	`, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to list order items: %w", err)
	}
	defer rows.Close()

	items := []*store.OrderItem{}
	for rows.Next() {
		var it store.OrderItem
		var fulfilled int
		if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.ProductName, &it.UnitPrice, &it.Quantity, &fulfilled); err != nil {
			return nil, fmt.Errorf("failed to scan order item: %w", err)
		}
		it.Fulfilled = fulfilled == 1
		items = append(items, &it)
	}
	return items, nil
}

// purchaseID builds a deterministic purchase id from the order + product so
// the idempotency guard (idempotent replay) can't double-insert.
func purchaseID(orderID, productID string) string {
	return orderID + "-" + productID
}

// FulfillOrder validates stock for every item, records the purchases and
// decrements stock atomically. Idempotent: an already-paid order is returned
// as-is without touching stock twice.
func (r *Repository) FulfillOrder(ctx context.Context, orderID, externalRef string) (*store.Order, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin fulfill tx: %w", err)
	}
	defer tx.Rollback()

	// Inspect the order state first — replayed webhooks must be no-ops.
	var status string
	err = tx.QueryRowContext(ctx, `SELECT status FROM store_orders WHERE id = ?`, orderID).Scan(&status)
	if err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}
	if status == "paid" {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return r.GetOrder(ctx, orderID)
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT product_id, product_name, unit_price, quantity
		FROM store_order_items WHERE order_id = ?
	`, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to load order items: %w", err)
	}
	type line struct {
		productID   string
		productName string
		unitPrice  float64
		quantity    int
	}
	var lines []line
	for rows.Next() {
		var l line
		if err := rows.Scan(&l.productID, &l.productName, &l.unitPrice, &l.quantity); err != nil {
			rows.Close()
			return nil, fmt.Errorf("failed to scan line: %w", err)
		}
		lines = append(lines, l)
	}
	rows.Close()

	// Validate existence + stock for every line BEFORE writing anything.
	for _, l := range lines {
		var stock int
		err := tx.QueryRowContext(ctx, `SELECT stock FROM products WHERE id = ?`, l.productID).Scan(&stock)
		if err != nil {
			return nil, fmt.Errorf("product %s not found: %w", l.productID, err)
		}
		if stock < l.quantity {
			return nil, fmt.Errorf("insufficient stock for %s: have %d, need %d", l.productName, stock, l.quantity)
		}
	}

	// Record purchases + decrement stock + mark items fulfilled + log to sales.
	// The sales table is what the coach dashboard reads for revenue metrics
	// and the ventas page — writing here makes MP purchases immediately visible.
	for _, l := range lines {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO store_purchases (id, athlete_id, product_id, quantity, price, created_at)
			VALUES (?, (SELECT athlete_id FROM store_orders WHERE id = ?), ?, ?, ?, datetime('now'))
		`, purchaseID(orderID, l.productID), orderID, l.productID, l.quantity, l.unitPrice); err != nil {
			return nil, fmt.Errorf("failed to record purchase: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE products SET stock = stock - ? WHERE id = ?
		`, l.quantity, l.productID); err != nil {
			return nil, fmt.Errorf("failed to decrement stock: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE store_order_items SET fulfilled = 1 WHERE order_id = ? AND product_id = ?
		`, orderID, l.productID); err != nil {
			return nil, fmt.Errorf("failed to mark item fulfilled: %w", err)
		}
		// Mirror into the sales table for dashboard revenue + ventas page.
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id, created_at)
			VALUES (?, ?, ?, (SELECT COALESCE(brand, '') FROM products WHERE id = ?), ?, ?, 0, ?, date('now'), (SELECT coach_id FROM products WHERE id = ?), datetime('now'))
		`, "sls-"+purchaseID(orderID, l.productID), l.productID, l.productName, l.productID, l.quantity, l.unitPrice, l.unitPrice*float64(l.quantity), l.productID); err != nil {
			return nil, fmt.Errorf("failed to log sale for dashboard: %w", err)
		}
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE store_orders SET status = 'paid', external_ref = COALESCE(NULLIF(?, ''), external_ref), paid_at = datetime('now')
		WHERE id = ?
	`, externalRef, orderID); err != nil {
		return nil, fmt.Errorf("failed to mark order paid: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit fulfill tx: %w", err)
	}
	return r.GetOrder(ctx, orderID)
}
