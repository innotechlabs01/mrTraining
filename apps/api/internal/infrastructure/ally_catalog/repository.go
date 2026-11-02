// Package ally_catalog provides the persistence layer for the ally catalog.
package ally_catalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	allycatalogdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_catalog"
)

// Repository implements ally_catalog.Repository using the libsql/SQLite driver.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new ally catalog repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ResolveAllyID returns the ally the given user owns (allies.owner_user_id) or
// belongs to (ally_members). When the user is linked to several allies the
// result is ambiguous and an error is returned so the caller does not pick the
// wrong one.
func (r *Repository) ResolveAllyID(ctx context.Context, userID string) (string, error) {
	var allyID string
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(MIN(a.id), '')
		FROM allies a
		WHERE a.owner_user_id = $1
		   OR a.id IN (SELECT ally_id FROM ally_members WHERE user_id = $2)
	`, userID, userID).Scan(&count, &allyID)
	if err != nil {
		return "", fmt.Errorf("failed to resolve ally for user: %w", err)
	}
	if count == 0 {
		return "", allycatalogdomain.ErrNotFound
	}
	if count > 1 {
		return "", fmt.Errorf("user %s is linked to %d allies; specify the ally explicitly", userID, count)
	}
	return allyID, nil
}

// ResolveAllyIDByCoachID returns the ally owned by the given coach (owner_user_id).
func (r *Repository) ResolveAllyIDByCoachID(ctx context.Context, coachID string) (string, error) {
	var allyID string
	err := r.db.QueryRowContext(ctx, `SELECT id FROM allies WHERE owner_user_id = $3 LIMIT 1`, coachID).Scan(&allyID)
	if err == sql.ErrNoRows {
		return "", allycatalogdomain.ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("failed to resolve ally for coach: %w", err)
	}
	return allyID, nil
}

// ListProducts returns every product of an ally, optionally active only.
func (r *Repository) ListProducts(ctx context.Context, allyID string, activeOnly bool) ([]*allycatalogdomain.AllyProduct, error) {
	query := `
		SELECT id, ally_id, name, description, image_url, price_cents, currency, stock, active, created_at, updated_at
		FROM ally_products WHERE ally_id = $4
	`
	args := []any{allyID}
	if activeOnly {
		query += " AND active = 1"
	}
	query += " ORDER BY name COLLATE NOCASE"
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list products: %w", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

// GetProduct returns a product only when it belongs to allyID.
func (r *Repository) GetProduct(ctx context.Context, allyID, productID string) (*allycatalogdomain.AllyProduct, error) {
	return scanProduct(r.db.QueryRowContext(ctx, `
		SELECT id, ally_id, name, description, image_url, price_cents, currency, stock, active, created_at, updated_at
		FROM ally_products WHERE id = $5 AND ally_id = $6
	`, productID, allyID))
}

// CreateProduct inserts a product for allyID.
func (r *Repository) CreateProduct(ctx context.Context, in allycatalogdomain.CreateProductInput) (*allycatalogdomain.AllyProduct, error) {
	id := uuid.New().String()
	active := 0
	if in.Active {
		active = 1
	}
	if _, err := r.db.ExecContext(ctx, `
		INSERT INTO ally_products (id, ally_id, name, description, image_url, price_cents, currency, stock, active, created_at, updated_at)
		VALUES ($7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
	`, id, in.AllyID, in.Name, in.Description, in.ImageURL, in.PriceCents, in.Currency, in.Stock, active); err != nil {
		return nil, fmt.Errorf("failed to insert product: %w", err)
	}
	return r.GetProduct(ctx, in.AllyID, id)
}

// UpdateProduct updates a product only when it belongs to allyID. Only
// non-nil fields of `in` are changed.
func (r *Repository) UpdateProduct(ctx context.Context, allyID, productID string, in allycatalogdomain.UpdateProductInput) (*allycatalogdomain.AllyProduct, error) {
	sets := []string{"updated_at = NOW()"}
	args := []any{}
	if in.Name != nil {
		sets = append(sets, "name = $16")
		args = append(args, *in.Name)
	}
	if in.Description != nil {
		sets = append(sets, "description = $17")
		args = append(args, *in.Description)
	}
	if in.ImageURL != nil {
		sets = append(sets, "image_url = $18")
		args = append(args, *in.ImageURL)
	}
	if in.PriceCents != nil {
		sets = append(sets, "price_cents = $19")
		args = append(args, *in.PriceCents)
	}
	if in.Currency != nil {
		sets = append(sets, "currency = $20")
		args = append(args, *in.Currency)
	}
	if in.Stock != nil {
		sets = append(sets, "stock = $21")
		args = append(args, *in.Stock)
	}
	if in.Active != nil {
		sets = append(sets, "active = $22")
		if *in.Active {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}
	args = append(args, productID, allyID)

	res, err := r.db.ExecContext(ctx, `
		UPDATE ally_products SET `+sets[0]+", "+stringsJoin(sets[1:], ", ")+` WHERE id = $23 AND ally_id = $24
	`, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update product: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, allycatalogdomain.ErrNotFound
	}
	return r.GetProduct(ctx, allyID, productID)
}

// ListServices returns every service of an ally, optionally active only.
func (r *Repository) ListServices(ctx context.Context, allyID string, activeOnly bool) ([]*allycatalogdomain.AllyService, error) {
	query := `
		SELECT id, ally_id, name, description, image_url, price_cents, currency, duration_min, capacity, active, created_at, updated_at
		FROM ally_services WHERE ally_id = $25
	`
	args := []any{allyID}
	if activeOnly {
		query += " AND active = 1"
	}
	query += " ORDER BY name COLLATE NOCASE"
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}
	defer rows.Close()
	return scanServices(rows)
}

// GetService returns a service only when it belongs to allyID.
func (r *Repository) GetService(ctx context.Context, allyID, serviceID string) (*allycatalogdomain.AllyService, error) {
	return scanService(r.db.QueryRowContext(ctx, `
		SELECT id, ally_id, name, description, image_url, price_cents, currency, duration_min, capacity, active, created_at, updated_at
		FROM ally_services WHERE id = $26 AND ally_id = $27
	`, serviceID, allyID))
}

// CreateService inserts a service for allyID.
func (r *Repository) CreateService(ctx context.Context, in allycatalogdomain.CreateServiceInput) (*allycatalogdomain.AllyService, error) {
	id := uuid.New().String()
	active := 0
	if in.Active {
		active = 1
	}
	if _, err := r.db.ExecContext(ctx, `
		INSERT INTO ally_services (id, ally_id, name, description, image_url, price_cents, currency, duration_min, capacity, active, created_at, updated_at)
		VALUES ($28, $29, $30, $31, $32, $33, $34, $35, $36, $37, NOW(), NOW())
	`, id, in.AllyID, in.Name, in.Description, in.ImageURL, in.PriceCents, in.Currency, in.DurationMin, in.Capacity, active); err != nil {
		return nil, fmt.Errorf("failed to insert service: %w", err)
	}
	return r.GetService(ctx, in.AllyID, id)
}

// UpdateService updates a service only when it belongs to allyID.
func (r *Repository) UpdateService(ctx context.Context, allyID, serviceID string, in allycatalogdomain.UpdateServiceInput) (*allycatalogdomain.AllyService, error) {
	sets := []string{"updated_at = NOW()"}
	args := []any{}
	if in.Name != nil {
		sets = append(sets, "name = $38")
		args = append(args, *in.Name)
	}
	if in.Description != nil {
		sets = append(sets, "description = $39")
		args = append(args, *in.Description)
	}
	if in.ImageURL != nil {
		sets = append(sets, "image_url = $40")
		args = append(args, *in.ImageURL)
	}
	if in.PriceCents != nil {
		sets = append(sets, "price_cents = $41")
		args = append(args, *in.PriceCents)
	}
	if in.Currency != nil {
		sets = append(sets, "currency = $42")
		args = append(args, *in.Currency)
	}
	if in.DurationMin != nil {
		sets = append(sets, "duration_min = $43")
		args = append(args, *in.DurationMin)
	}
	if in.Capacity != nil {
		sets = append(sets, "capacity = $44")
		args = append(args, *in.Capacity)
	}
	if in.Active != nil {
		sets = append(sets, "active = $45")
		if *in.Active {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}
	args = append(args, serviceID, allyID)

	res, err := r.db.ExecContext(ctx, `
		UPDATE ally_services SET `+sets[0]+", "+stringsJoin(sets[1:], ", ")+` WHERE id = $46 AND ally_id = $47
	`, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update service: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, allycatalogdomain.ErrNotFound
	}
	return r.GetService(ctx, allyID, serviceID)
}

func scanProducts(rows *sql.Rows) ([]*allycatalogdomain.AllyProduct, error) {
	var out []*allycatalogdomain.AllyProduct
	for rows.Next() {
		p, err := scanProductRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func scanProduct(row *sql.Row) (*allycatalogdomain.AllyProduct, error) {
	return scanProductRow(row)
}

func scanProductRow(row scanner) (*allycatalogdomain.AllyProduct, error) {
	var p allycatalogdomain.AllyProduct
	var active int
	err := row.Scan(&p.ID, &p.AllyID, &p.Name, &p.Description, &p.ImageURL, &p.PriceCents, &p.Currency, &p.Stock, &active, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, allycatalogdomain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan product: %w", err)
	}
	p.Active = active == 1
	return &p, nil
}

func scanServices(rows *sql.Rows) ([]*allycatalogdomain.AllyService, error) {
	var out []*allycatalogdomain.AllyService
	for rows.Next() {
		s, err := scanServiceRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func scanService(row *sql.Row) (*allycatalogdomain.AllyService, error) {
	return scanServiceRow(row)
}

func scanServiceRow(row scanner) (*allycatalogdomain.AllyService, error) {
	var s allycatalogdomain.AllyService
	var active int
	err := row.Scan(&s.ID, &s.AllyID, &s.Name, &s.Description, &s.ImageURL, &s.PriceCents, &s.Currency, &s.DurationMin, &s.Capacity, &active, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, allycatalogdomain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan service: %w", err)
	}
	s.Active = active == 1
	return &s, nil
}

// GetProductByID returns a product by ID regardless of which ally owns it.
// Used by athletes purchasing through their coach's active relationship.
func (r *Repository) GetProductByID(ctx context.Context, productID string) (*allycatalogdomain.AllyProduct, error) {
	return scanProduct(r.db.QueryRowContext(ctx, `
		SELECT id, ally_id, name, description, image_url, price_cents, currency, stock, active, created_at, updated_at
		FROM ally_products WHERE id = $48
	`, productID))
}

// scanner abstracts *sql.Row and *sql.Rows for shared scanning.
type scanner interface {
	Scan(dest ...any) error
}

// stringsJoin joins strings with sep.
func stringsJoin(ss []string, sep string) string {
	if len(ss) == 0 {
		return ""
	}
	out := ss[0]
	for _, s := range ss[1:] {
		out += sep + s
	}
	return out
}
