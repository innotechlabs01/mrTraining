// Package subscription provides the PostgreSQL implementation of the
// subscription.Repository port. Queries use database/sql with the pgx driver
// and $1 placeholders, following the repository pattern used across the API.
package subscription

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements subscription.Repository using PostgreSQL.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a new subscription repository. By default all queries
// run against the connection pool. Use SetExecutor to inject a *sql.Tx for
// transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) subscription.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// Save persists a subscription aggregate. On insert it sets created_at/updated_at;
// on update it bumps the version column optimistically.
func (r *Repository) Save(ctx context.Context, s *subscription.Subscription) error {
	existing, err := r.FindByID(ctx, s.ID)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok && appErr.Code == "NOT_FOUND" {
			existing = nil
		} else {
			return fmt.Errorf("find existing subscription: %w", err)
		}
	}
	if existing == nil {
		return r.insert(ctx, s)
	}
	return r.update(ctx, s, existing.Version)
}

func (r *Repository) insert(ctx context.Context, s *subscription.Subscription) error {
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO subscriptions (
			id, athlete_id, coach_id, plan_id, plan_name, plan_price,
			currency, billing_period, status, cancel_at_period_end, canceled_at,
			current_period_start, current_period_end, grace_period_days,
			payment_due_date, version, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`,
		s.ID, s.AthleteID, s.CoachID, s.PlanID, s.PlanName, s.PlanPrice,
		s.Currency, s.BillingPeriod, string(s.Status), s.CancelAtPeriodEnd,
		nullTime(s.CanceledAt), s.CurrentPeriodStart, s.CurrentPeriodEnd,
		s.GracePeriodDays, s.PaymentDueDate, s.Version,
	)
	if err != nil {
		return fmt.Errorf("insert subscription: %w", err)
	}
	return nil
}

func (r *Repository) update(ctx context.Context, s *subscription.Subscription, existingVersion int) error {
	result, err := r.exec.ExecContext(ctx, `
		UPDATE subscriptions
		SET athlete_id = $1, coach_id = $2, plan_id = $3, plan_name = $4,
		    plan_price = $5, currency = $6, billing_period = $7, status = $8,
		    cancel_at_period_end = $9, canceled_at = $10,
		    current_period_start = $11, current_period_end = $12,
		    grace_period_days = $13, payment_due_date = $14,
		    version = $15, updated_at = NOW()
		WHERE id = $16 AND version = $17`,
		s.ID, s.AthleteID, s.CoachID, s.PlanID, s.PlanName, s.PlanPrice,
		s.Currency, s.BillingPeriod, string(s.Status), s.CancelAtPeriodEnd,
		nullTime(s.CanceledAt), s.CurrentPeriodStart, s.CurrentPeriodEnd,
		s.GracePeriodDays, s.PaymentDueDate, s.Version+1, existingVersion,
	)
	if err != nil {
		return fmt.Errorf("update subscription: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if rows == 0 {
		return errors.Conflict("subscription was modified concurrently")
	}
	s.Version = existingVersion + 1
	return nil
}

// FindByID returns a subscription by its id.
func (r *Repository) FindByID(ctx context.Context, id string) (*subscription.Subscription, error) {
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, athlete_id, coach_id, plan_id, plan_name, plan_price,
		       currency, billing_period, status, cancel_at_period_end, canceled_at,
		       current_period_start, current_period_end, grace_period_days,
		       payment_due_date, version, created_at, updated_at
		FROM subscriptions WHERE id = $1`, id)
	return scanSubscription(row)
}

// FindByAthlete returns the athlete's most recent subscription.
func (r *Repository) FindByAthlete(ctx context.Context, athleteID string) (*subscription.Subscription, error) {
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, athlete_id, coach_id, plan_id, plan_name, plan_price,
		       currency, billing_period, status, cancel_at_period_end, canceled_at,
		       current_period_start, current_period_end, grace_period_days,
		       payment_due_date, version, created_at, updated_at
		FROM subscriptions WHERE athlete_id = $1
		ORDER BY created_at DESC LIMIT 1`, athleteID)
	return scanSubscription(row)
}

// FindByCoach returns all subscriptions for a coach's athletes.
func (r *Repository) FindByCoach(ctx context.Context, coachID string) ([]*subscription.Subscription, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, athlete_id, coach_id, plan_id, plan_name, plan_price,
		       currency, billing_period, status, cancel_at_period_end, canceled_at,
		       current_period_start, current_period_end, grace_period_days,
		       payment_due_date, version, created_at, updated_at
		FROM subscriptions WHERE coach_id = $1
		ORDER BY current_period_end DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("list subscriptions by coach: %w", err)
	}
	defer rows.Close()

	subs := []*subscription.Subscription{}
	for rows.Next() {
		s, err := scanSubscription(rows)
		if err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list subscriptions by coach: %w", err)
	}
	if subs == nil {
		subs = []*subscription.Subscription{}
	}
	return subs, nil
}

// RecordPayment persists a payment linked to a subscription. Idempotent per
// provider_payment_id: replayed calls are no-ops.
func (r *Repository) RecordPayment(ctx context.Context, p *subscription.Payment) error {
	if p.ProviderPaymentID != "" {
		var existingID string
		err := r.exec.QueryRowContext(ctx, `
			SELECT id FROM subscription_payments WHERE provider_payment_id = $1 LIMIT 1`,
			p.ProviderPaymentID).Scan(&existingID)
		if err == nil {
			return nil // already recorded — no-op
		}
	}
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO subscription_payments (
			id, subscription_id, provider_payment_id, external_reference,
			amount, currency, status, period_start, period_end, paid_at, created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
		p.ID, p.SubscriptionID, p.ProviderPaymentID, p.ExternalReference,
		p.Amount, p.Currency, p.Status, p.PeriodStart, p.PeriodEnd,
		nullTime(p.PaidAt),
	)
	if err != nil {
		return fmt.Errorf("insert subscription payment: %w", err)
	}
	return nil
}

// GetPaymentByProviderID returns a payment by the provider's payment id.
func (r *Repository) GetPaymentByProviderID(ctx context.Context, providerPaymentID string) (*subscription.Payment, error) {
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, subscription_id, provider_payment_id, external_reference,
		       amount, currency, status, period_start, period_end, paid_at, created_at
		FROM subscription_payments WHERE provider_payment_id = $1 LIMIT 1`, providerPaymentID)
	return scanPayment(row)
}

// HasApprovedPayment reports whether an approved payment exists for the
// subscription.
func (r *Repository) HasApprovedPayment(ctx context.Context, subscriptionID string) (bool, error) {
	var one int
	err := r.exec.QueryRowContext(ctx,
		`SELECT 1 FROM subscription_payments WHERE subscription_id = $1 AND status = 'approved' LIMIT 1`,
		subscriptionID).Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check approved payment: %w", err)
	}
	return true, nil
}

type scannable interface {
	Scan(dest ...interface{}) error
}

func scanSubscription(s scannable) (*subscription.Subscription, error) {
	var (
		sub        subscription.Subscription
		canceledAt sql.NullTime
		status     string
		createdAt  time.Time
		updatedAt  time.Time
	)
	err := s.Scan(
		&sub.ID, &sub.AthleteID, &sub.CoachID, &sub.PlanID, &sub.PlanName,
		&sub.PlanPrice, &sub.Currency, &sub.BillingPeriod, &status,
		&sub.CancelAtPeriodEnd, &canceledAt, &sub.CurrentPeriodStart,
		&sub.CurrentPeriodEnd, &sub.GracePeriodDays, &sub.PaymentDueDate,
		&sub.Version, &createdAt, &updatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Subscription", "")
	}
	if err != nil {
		return nil, err
	}
	sub.Status = subscription.Status(status)
	if canceledAt.Valid {
		sub.CanceledAt = &canceledAt.Time
	}
	sub.CreatedAt = createdAt
	sub.UpdatedAt = updatedAt
	return &sub, nil
}

func scanPayment(s scannable) (*subscription.Payment, error) {
	var p subscription.Payment
	var paidAt sql.NullTime
	err := s.Scan(&p.ID, &p.SubscriptionID, &p.ProviderPaymentID, &p.ExternalReference,
		&p.Amount, &p.Currency, &p.Status, &p.PeriodStart, &p.PeriodEnd,
		&paidAt, &p.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Payment", "")
	}
	if err != nil {
		return nil, err
	}
	if paidAt.Valid {
		p.PaidAt = &paidAt.Time
	}
	return &p, nil
}

// nullTime converts a nil *time.Time to a NULL parameter.
func nullTime(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return *t
}
