// Package plan provides SQLite persistence for the plan domain.
package plan

import (
	"context"
	"database/sql"
	"fmt"

	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements plandomain.Repository using SQLite/libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new plan repository.
// By default, all queries run against the connection pool. Use SetExecutor to
// inject a *sql.Tx for transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
// When set, all repository queries run against this executor instead of the
// connection pool.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) plandomain.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx (injected by a
// UnitOfWork) rather than the connection pool.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

func (r *Repository) ListByCoach(ctx context.Context, coachID string, activeOnly bool) ([]*plandomain.Plan, error) {
	query := `SELECT id, name, description, price, currency, billing_period,
		max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id, trm,
		discount_type, discount_value, discount_label, discount_valid_from,
		discount_valid_until, discount_code, created_at, updated_at
		FROM plans WHERE coach_id = $1`
	if activeOnly {
		query += " AND is_active = 1"
	}
	rows, err := r.exec.QueryContext(ctx, query, coachID)
	if err != nil {
		return nil, fmt.Errorf("list plans by coach: %w", err)
	}
	defer rows.Close()

	plans := []*plandomain.Plan{}
	for rows.Next() {
		p, err := scanPlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list plans by coach: %w", err)
	}
	return plans, nil
}

// ListAllActive returns all active (published) plans across all coaches.
func (r *Repository) ListAllActive(ctx context.Context) ([]*plandomain.Plan, error) {
	query := `SELECT id, name, description, price, currency, billing_period,
		max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id, trm,
		discount_type, discount_value, discount_label, discount_valid_from,
		discount_valid_until, discount_code, created_at, updated_at
		FROM plans WHERE is_active = 1 ORDER BY price`
	rows, err := r.exec.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list all active plans: %w", err)
	}
	defer rows.Close()

	plans := []*plandomain.Plan{}
	for rows.Next() {
		p, err := scanPlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list all active plans: %w", err)
	}
	return plans, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*plandomain.Plan, error) {
	row := r.exec.QueryRowContext(ctx, `SELECT id, name, description, price, currency, billing_period,
		max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id, trm,
		discount_type, discount_value, discount_label, discount_valid_from,
		discount_valid_until, discount_code, created_at, updated_at
		FROM plans WHERE id = $1`, id)
	return scanPlanRow(row)
}

func (r *Repository) Create(ctx context.Context, p *plandomain.Plan) error {
	_, err := r.exec.ExecContext(ctx, `INSERT INTO plans (
		id, name, description, price, currency, billing_period,
		max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id, trm,
		discount_type, discount_value, discount_label, discount_valid_from,
		discount_valid_until, discount_code, created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())`,
		p.ID, p.Name, p.Description, p.Price, p.Currency, p.BillingPeriod,
		p.MaxAthletes, p.MaxSessionsPerWeek, boolToInt(p.IsActive), p.AthleteCount, p.CoachID, p.TRM,
		p.DiscountType, p.DiscountValue, p.DiscountLabel, p.DiscountValidFrom,
		p.DiscountValidUntil, p.DiscountCode)
	if err != nil {
		return fmt.Errorf("create plan: %w", err)
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, p *plandomain.Plan) error {
	result, err := r.exec.ExecContext(ctx, `UPDATE plans SET
		name = $1, description = $2, price = $3, currency = $4, billing_period = $5,
		max_athletes = $6, max_sessions_per_week = $7, is_active = $8, athlete_count = $9,
		trm = $10, discount_type = $11, discount_value = $12, discount_label = $13,
		discount_valid_from = $14, discount_valid_until = $15, discount_code = $16,
		updated_at = NOW()
		WHERE id = $17`,
		p.Name, p.Description, p.Price, p.Currency, p.BillingPeriod,
		p.MaxAthletes, p.MaxSessionsPerWeek, boolToInt(p.IsActive), p.AthleteCount,
		p.TRM, p.DiscountType, p.DiscountValue, p.DiscountLabel,
		p.DiscountValidFrom, p.DiscountValidUntil, p.DiscountCode, p.ID)
	if err != nil {
		return fmt.Errorf("update plan: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.NotFound("Plan", p.ID)
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.exec.ExecContext(ctx, `DELETE FROM plans WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete plan: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.NotFound("Plan", id)
	}
	return nil
}

type scannable interface {
	Scan(dest ...interface{}) error
}

func scanPlan(s scannable) (*plandomain.Plan, error) {
	var (
		p          plandomain.Plan
		isActive   int
		discountTy sql.NullString
		discountVa sql.NullFloat64
		discountLa sql.NullString
		discountVf sql.NullString
		discountVu sql.NullString
		discountC  sql.NullString
	)
	err := s.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Currency, &p.BillingPeriod,
		&p.MaxAthletes, &p.MaxSessionsPerWeek, &isActive, &p.AthleteCount, &p.CoachID, &p.TRM,
		&discountTy, &discountVa, &discountLa, &discountVf, &discountVu, &discountC,
		&p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	p.IsActive = isActive == 1
	p.DiscountType = discountTy.String
	p.DiscountValue = discountVa.Float64
	p.DiscountLabel = discountLa.String
	p.DiscountValidFrom = discountVf.String
	p.DiscountValidUntil = discountVu.String
	p.DiscountCode = discountC.String
	return &p, nil
}

func scanPlanRow(row *sql.Row) (*plandomain.Plan, error) {
	p, err := scanPlan(row)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Plan", "")
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// ListVersionsByPlan returns all versions for a plan.
func (r *Repository) ListVersionsByPlan(ctx context.Context, planID string) ([]*plandomain.Version, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, plan_id, price_cents, currency, duration_unit, benefits, cta_text, is_active, created_at
		 FROM plan_versions WHERE plan_id = $1 AND is_active = true`, planID)
	if err != nil {
		return nil, fmt.Errorf("list plan versions: %w", err)
	}
	defer rows.Close()

	var versions []*plandomain.Version
	for rows.Next() {
		v := &plandomain.Version{}
		if err := rows.Scan(&v.ID, &v.PlanID, &v.PriceCents, &v.Currency, &v.DurationUnit, &v.Benefits, &v.CTAText, &v.IsActive, &v.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan plan version: %w", err)
		}
		versions = append(versions, v)
	}
	if versions == nil {
		versions = []*plandomain.Version{}
	}
	return versions, nil
}
