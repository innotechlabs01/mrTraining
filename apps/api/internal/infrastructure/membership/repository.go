package membership

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements membership.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new membership repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetByAthleteID retrieves the most recent membership for an athlete.
func (r *Repository) GetByAthleteID(ctx context.Context, athleteID string) (*membership.Membership, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, athlete_id, coach_id, plan_name, plan_price, billing_period,
		 status, current_period_start, current_period_end, grace_period_days,
		 payment_due_date, created_at, updated_at
		 FROM athlete_memberships WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1`, athleteID)

	m := &membership.Membership{}
	err := row.Scan(&m.ID, &m.AthleteID, &m.CoachID, &m.PlanName, &m.PlanPrice,
		&m.BillingPeriod, &m.Status, &m.CurrentPeriodStart, &m.CurrentPeriodEnd,
		&m.GracePeriodDays, &m.PaymentDueDate, &m.CreatedAt, &m.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Membership", athleteID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get membership by athlete ID: %w", err)
	}
	return m, nil
}

// GetByID retrieves a membership by its unique identifier.
func (r *Repository) GetByID(ctx context.Context, id string) (*membership.Membership, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, athlete_id, coach_id, plan_name, plan_price, billing_period,
		 status, current_period_start, current_period_end, grace_period_days,
		 payment_due_date, created_at, updated_at
		 FROM athlete_memberships WHERE id = ?`, id)

	m := &membership.Membership{}
	err := row.Scan(&m.ID, &m.AthleteID, &m.CoachID, &m.PlanName, &m.PlanPrice,
		&m.BillingPeriod, &m.Status, &m.CurrentPeriodStart, &m.CurrentPeriodEnd,
		&m.GracePeriodDays, &m.PaymentDueDate, &m.CreatedAt, &m.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Membership", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get membership by ID: %w", err)
	}
	return m, nil
}

// Create inserts a new membership record.
func (r *Repository) Create(ctx context.Context, m *membership.Membership) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO athlete_memberships
		 (id, athlete_id, coach_id, plan_name, plan_price, billing_period, status,
		  current_period_start, current_period_end, grace_period_days, payment_due_date,
		  created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
		m.ID, m.AthleteID, m.CoachID, m.PlanName, m.PlanPrice, m.BillingPeriod,
		m.Status, m.CurrentPeriodStart, m.CurrentPeriodEnd, m.GracePeriodDays,
		m.PaymentDueDate)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "duplicate") {
			return errors.Conflict(fmt.Sprintf("membership already exists for athlete %s", m.AthleteID))
		}
		return fmt.Errorf("failed to create membership: %w", err)
	}
	return nil
}

// Update modifies an existing membership record.
func (r *Repository) Update(ctx context.Context, m *membership.Membership) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE athlete_memberships
		 SET plan_name = ?, plan_price = ?, billing_period = ?, status = ?,
		     current_period_start = ?, current_period_end = ?, grace_period_days = ?,
		     payment_due_date = ?, updated_at = datetime('now')
		 WHERE id = ?`,
		m.PlanName, m.PlanPrice, m.BillingPeriod, m.Status,
		m.CurrentPeriodStart, m.CurrentPeriodEnd, m.GracePeriodDays,
		m.PaymentDueDate, m.ID)
	if err != nil {
		return fmt.Errorf("failed to update membership: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Membership", m.ID)
	}
	return nil
}

// Cancel sets a membership status to "cancelled".
func (r *Repository) Cancel(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE athlete_memberships SET status = 'cancelled', updated_at = datetime('now')
		 WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to cancel membership: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Membership", id)
	}
	return nil
}

// ListByCoach retrieves all memberships for athletes of a specific coach.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*membership.Membership, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, athlete_id, coach_id, plan_name, plan_price, billing_period,
		 status, current_period_start, current_period_end, grace_period_days,
		 payment_due_date, created_at, updated_at
		 FROM athlete_memberships WHERE coach_id = ? ORDER BY current_period_end DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list memberships by coach: %w", err)
	}
	defer rows.Close()

	var memberships []*membership.Membership
	for rows.Next() {
		m := &membership.Membership{}
		if err := rows.Scan(&m.ID, &m.AthleteID, &m.CoachID, &m.PlanName, &m.PlanPrice,
			&m.BillingPeriod, &m.Status, &m.CurrentPeriodStart, &m.CurrentPeriodEnd,
			&m.GracePeriodDays, &m.PaymentDueDate, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan membership: %w", err)
		}
		memberships = append(memberships, m)
	}
	if memberships == nil {
		memberships = []*membership.Membership{}
	}
	return memberships, nil
}

// GetPaymentHistory retrieves payment records for an athlete, ordered by most recent.
func (r *Repository) GetPaymentHistory(ctx context.Context, athleteID string) ([]*membership.Payment, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, membership_id, amount, currency, status, polar_order_id,
		 period_start, period_end, paid_at, created_at
		 FROM membership_payments WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 24`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get payment history: %w", err)
	}
	defer rows.Close()

	var payments []*membership.Payment
	for rows.Next() {
		p := &membership.Payment{}
		var polarOrderID, paidAt sql.NullString
		if err := rows.Scan(&p.ID, &p.MembershipID, &p.Amount, &p.Currency, &p.Status,
			&polarOrderID, &p.PeriodStart, &p.PeriodEnd, &paidAt, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan payment: %w", err)
		}
		if polarOrderID.Valid {
			p.PolarOrderID = polarOrderID.String
		}
		if paidAt.Valid {
			p.PaidAt = paidAt.String
		}
		payments = append(payments, p)
	}
	if payments == nil {
		payments = []*membership.Payment{}
	}
	return payments, nil
}

// RecordPayment inserts a new payment record.
func (r *Repository) RecordPayment(ctx context.Context, p *membership.Payment) error {
	// Idempotency guard: skip duplicate Polar order IDs
	if p.PolarOrderID != "" {
		var existingID string
		err := r.db.QueryRowContext(ctx,
			`SELECT id FROM membership_payments WHERE polar_order_id = ? LIMIT 1`,
			p.PolarOrderID).Scan(&existingID)
		if err == nil {
			// Already recorded — no-op
			return nil
		}
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO membership_payments
		 (id, membership_id, amount, currency, status, polar_order_id,
		  period_start, period_end, paid_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		p.ID, p.MembershipID, p.Amount, p.Currency, p.Status,
		nullString(p.PolarOrderID), p.PeriodStart, p.PeriodEnd,
		nullString(p.PaidAt))
	if err != nil {
		return fmt.Errorf("failed to record payment: %w", err)
	}
	return nil
}

// nullString converts an empty string to sql.NullString with Valid=false.
func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
