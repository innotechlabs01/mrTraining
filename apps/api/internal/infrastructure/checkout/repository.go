// Package checkout provides PostgreSQL persistence for pending checkouts.
//
// Every read and write runs in a transaction that sets the RLS context, so
// the policies of pending_checkouts can restrict the application to the row
// it is working on (the payer's email and the checkout being claimed).
package checkout

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/domain/checkout"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements checkout.Repository with PostgreSQL.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a pending checkout repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a transactional executor.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// Create inserts a pending checkout.
func (r *Repository) Create(ctx context.Context, c *checkout.Checkout) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("create pending checkout: begin tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`SELECT set_config('app.checkout_id', $1, true)`, c.ID); err != nil {
		return fmt.Errorf("create pending checkout: set rls context: %w", err)
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO pending_checkouts (
			id, email, plan_id, plan_name, amount, currency,
			provider_reference, provider_payment_id, status, user_id, coach_code,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING`,
		c.ID, c.Email, c.PlanID, c.PlanName, c.Amount, c.Currency,
		c.ProviderReference, c.ProviderPaymentID, c.Status, c.UserID, c.CoachCode,
	); err != nil {
		return fmt.Errorf("create pending checkout: %w", err)
	}

	return tx.Commit()
}

// GetByID returns a checkout by id.
func (r *Repository) GetByID(ctx context.Context, id string) (*checkout.Checkout, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("get pending checkout: begin tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`SELECT set_config('app.checkout_id', $1, true)`, id); err != nil {
		return nil, fmt.Errorf("get pending checkout: set rls context: %w", err)
	}

	row := tx.QueryRowContext(ctx,
		`SELECT id, email, plan_id, plan_name, amount, currency,
		 provider_reference, provider_payment_id, status, user_id, coach_code,
		 created_at, updated_at
		 FROM pending_checkouts WHERE id = $1`, id)
	co, err := scanCheckout(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("get pending checkout: commit: %w", err)
	}
	return co, nil
}

// GetLatestByEmail returns the most recent checkout for an email.
func (r *Repository) GetLatestByEmail(ctx context.Context, email string) (*checkout.Checkout, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("get pending checkout: begin tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`SELECT set_config('app.checkout_email', $1, true)`, strings.TrimSpace(email)); err != nil {
		return nil, fmt.Errorf("get pending checkout: set rls context: %w", err)
	}

	row := tx.QueryRowContext(ctx,
		`SELECT id, email, plan_id, plan_name, amount, currency,
		 provider_reference, provider_payment_id, status, user_id, coach_code,
		 created_at, updated_at
		 FROM pending_checkouts WHERE LOWER(email) = LOWER($1)
		 ORDER BY created_at DESC LIMIT 1`, strings.TrimSpace(email))
	co, err := scanCheckout(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("get pending checkout: commit: %w", err)
	}
	return co, nil
}

// Save persists the changes of a checkout.
func (r *Repository) Save(ctx context.Context, c *checkout.Checkout) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("save pending checkout: begin tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`SELECT set_config('app.checkout_id', $1, true)`, c.ID); err != nil {
		return fmt.Errorf("save pending checkout: set rls context: %w", err)
	}

	if _, err := tx.ExecContext(ctx,
		`UPDATE pending_checkouts SET
		 amount = $1, currency = $2, provider_reference = $3, provider_payment_id = $4,
		 status = $5, user_id = $6, coach_code = $7, updated_at = NOW()
		 WHERE id = $8`,
		c.Amount, c.Currency, c.ProviderReference, c.ProviderPaymentID,
		c.Status, c.UserID, c.CoachCode, c.ID,
	); err != nil {
		return fmt.Errorf("save pending checkout: %w", err)
	}

	return tx.Commit()
}

func scanCheckout(row *sql.Row) (*checkout.Checkout, error) {
	var c checkout.Checkout
	var createdAt, updatedAt interface{}
	err := row.Scan(&c.ID, &c.Email, &c.PlanID, &c.PlanName, &c.Amount, &c.Currency,
		&c.ProviderReference, &c.ProviderPaymentID, &c.Status, &c.UserID, &c.CoachCode,
		&createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("scan pending checkout: %w", err)
	}
	c.CreatedAt = formatTime(createdAt)
	c.UpdatedAt = formatTime(updatedAt)
	return &c, nil
}

func formatTime(v interface{}) string {
	switch t := v.(type) {
	case time.Time:
		return t.UTC().Format(time.RFC3339)
	case string:
		return t
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", v)
	}
}
