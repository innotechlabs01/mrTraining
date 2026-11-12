package membership

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements membership.Repository using database/sql with Turso/libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new membership repository with the given database connection.
// By default, all queries run against the connection pool. Use SetExecutor to
// inject a *sql.Tx for transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// WithExecutor returns a repository instance using the given executor (typically
// a UnitOfWork transaction). Used by the application service's SetExecutor to
// propagate a transaction without mutating the original repository.
func (r *Repository) WithExecutor(exec database.Executor) membership.Repository {
	rr := *r
	rr.exec = exec
	return &rr
}

// isTx reports whether the current executor is a *sql.Tx (injected by a
// UnitOfWork) rather than the connection pool.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// GetByAthleteID retrieves the most recent membership for an athlete.
func (r *Repository) GetByAthleteID(ctx context.Context, athleteID string) (*membership.Membership, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, athlete_id, coach_id, plan_name, plan_price, billing_period,
 		 status, current_period_start, current_period_end, grace_period_days,
 		 payment_due_date, created_at, updated_at
 		 FROM athlete_memberships WHERE athlete_id = $1 ORDER BY created_at DESC LIMIT 1`, athleteID)

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
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, athlete_id, coach_id, plan_name, plan_price, billing_period,
 		 status, current_period_start, current_period_end, grace_period_days,
 		 payment_due_date, created_at, updated_at
 		 FROM athlete_memberships WHERE id = $1`, id)

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
	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO athlete_memberships
 		 (id, athlete_id, coach_id, plan_name, plan_price, billing_period, status,
 		  current_period_start, current_period_end, grace_period_days, payment_due_date,
 		  created_at, updated_at)
 		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
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
	result, err := r.exec.ExecContext(ctx,
		`UPDATE athlete_memberships
 		 SET plan_name = $1, plan_price = $2, billing_period = $3, status = $4,
 		     current_period_start = $5, current_period_end = $6, grace_period_days = $7,
 		     payment_due_date = $8, updated_at = NOW()
 		 WHERE id = $9`,
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
	result, err := r.exec.ExecContext(ctx,
		`UPDATE athlete_memberships SET status = 'cancelled', updated_at = NOW()
 		 WHERE id = $1`, id)
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
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, athlete_id, coach_id, plan_name, plan_price, billing_period,
 		 status, current_period_start, current_period_end, grace_period_days,
 		 payment_due_date, created_at, updated_at
 		 FROM athlete_memberships WHERE coach_id = $1 ORDER BY current_period_end DESC`, coachID)
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
	rows, err := r.exec.QueryContext(ctx,
		`SELECT mp.id, mp.membership_id, mp.amount, mp.currency, mp.status, mp.polar_order_id,
 		 mp.period_start, mp.period_end, mp.paid_at, mp.created_at
 		 FROM membership_payments mp
 		 JOIN athlete_memberships am ON mp.membership_id = am.id
 		 WHERE am.athlete_id = $1
 		 ORDER BY mp.created_at DESC LIMIT 24`, athleteID)
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
// Idempotent per Polar/MP order id — replays are no-ops.
func (r *Repository) RecordPayment(ctx context.Context, p *membership.Payment) error {
	// Idempotency guard: skip duplicate Polar order IDs
	if p.PolarOrderID != "" {
		var existingID string
		err := r.exec.QueryRowContext(ctx,
			`SELECT id FROM membership_payments WHERE polar_order_id = $1 LIMIT 1`,
			p.PolarOrderID).Scan(&existingID)
		if err == nil {
			// Already recorded — no-op
			return nil
		}
	}
	return r.insertPayment(ctx, p)
}

// GetPaymentByExternalID retrieves a payment record by its external gateway id.
// Used by the MercadoPago webhook to keep fulfillment idempotent.
func (r *Repository) GetPaymentByExternalID(ctx context.Context, externalID string) (*membership.Payment, error) {
	var p membership.Payment
	var polarOrderID, paidAt sql.NullString
	err := r.exec.QueryRowContext(ctx, `
		SELECT id, membership_id, amount, currency, status, polar_order_id,
		       period_start, period_end, paid_at, created_at
		FROM membership_payments WHERE polar_order_id = $1 LIMIT 1
	`, externalID).Scan(&p.ID, &p.MembershipID, &p.Amount, &p.Currency, &p.Status,
		&polarOrderID, &p.PeriodStart, &p.PeriodEnd, &paidAt, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get payment by external id: %w", err)
	}
	p.PolarOrderID = polarOrderID.String
	p.PaidAt = paidAt.String
	return &p, nil
}

func (r *Repository) insertPayment(ctx context.Context, p *membership.Payment) error {
	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO membership_payments
 		 (id, membership_id, amount, currency, status, polar_order_id,
 		  period_start, period_end, paid_at, created_at)
 		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
		p.ID, p.MembershipID, p.Amount, p.Currency, p.Status,
		nullString(p.PolarOrderID), p.PeriodStart, p.PeriodEnd,
		nullString(p.PaidAt))
	if err != nil {
		return fmt.Errorf("failed to record payment: %w", err)
	}
	return nil
}

// RecordMembershipSale mirrors a completed membership payment into the
// sales table so the coach dashboard and ventas page track the revenue.
// Uses the MP payment id as the sales row primary key for idempotency.
func (r *Repository) RecordMembershipSale(ctx context.Context, saleID string, m *membership.Membership) error {
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO sales
			(id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id, created_at)
		VALUES ($1, '', $2, 'membresia', 1, $3, 0, $4, CURRENT_DATE, $5, NOW())
		ON CONFLICT (id) DO NOTHING
	`, saleID, "Membresía: "+m.PlanName, m.PlanPrice, m.PlanPrice, m.CoachID)
	if err != nil {
		return fmt.Errorf("failed to record membership sale: %w", err)
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
