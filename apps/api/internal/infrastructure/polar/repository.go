package polar

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/polar"
)

// Repository implements the polar.Repository interface using libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new polar repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateCheckout inserts a new checkout record.
func (r *Repository) CreateCheckout(ctx context.Context, c *polar.PolarCheckout) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO polar_checkouts (id, membership_id, athlete_id, polar_order_id, checkout_url, status, amount_cents, currency, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
	`, c.ID, c.MembershipID, c.AthleteID, c.PolarOrderID, c.CheckoutURL, c.Status, c.AmountCents, c.Currency)
	if err != nil {
		return fmt.Errorf("failed to create checkout: %w", err)
	}
	return nil
}

// GetCheckout returns a checkout by ID.
func (r *Repository) GetCheckout(ctx context.Context, id string) (*polar.PolarCheckout, error) {
	var c polar.PolarCheckout
	var completedAt sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, membership_id, athlete_id, polar_order_id, checkout_url, status, amount_cents, currency, created_at, completed_at
		FROM polar_checkouts
		WHERE id = ?
	`, id).Scan(&c.ID, &c.MembershipID, &c.AthleteID, &c.PolarOrderID, &c.CheckoutURL, &c.Status, &c.AmountCents, &c.Currency, &c.CreatedAt, &completedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("checkout not found")
		}
		return nil, fmt.Errorf("failed to get checkout: %w", err)
	}
	if completedAt.Valid {
		c.CompletedAt = &completedAt.String
	}
	return &c, nil
}

// UpdateCheckoutStatus updates the checkout status.
func (r *Repository) UpdateCheckoutStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE polar_checkouts
		SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
		WHERE id = ?
	`, status, status, id)
	if err != nil {
		return fmt.Errorf("failed to update checkout status: %w", err)
	}
	return nil
}