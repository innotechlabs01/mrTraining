// Package plan provides SQLite persistence for the plan domain.
package plan

import (
	"context"
	"database/sql"
	"fmt"

	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements plandomain.Repository using SQLite/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new plan repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByCoach(ctx context.Context, coachID string, activeOnly bool) ([]*plandomain.Plan, error) {
	query := `SELECT id, name, description, price, currency, billing_period,
		max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id, trm,
		discount_type, discount_value, discount_label, discount_valid_from,
		discount_valid_until, discount_code, created_at, updated_at
		FROM plans WHERE coach_id = ?`
	if activeOnly {
		query += ` AND is_active = 1`
	}
	query += ` ORDER BY price ASC`

	rows, err := r.db.QueryContext(ctx, query, coachID)
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

func (r *Repository) GetByID(ctx context.Context, id string) (*plandomain.Plan, error) {
	row := r.db.QueryRowContext(ctx, `SELECT id, name, description, price, currency, billing_period,
		max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id, trm,
		discount_type, discount_value, discount_label, discount_valid_from,
		discount_valid_until, discount_code, created_at, updated_at
		FROM plans WHERE id = ?`, id)
	return scanPlanRow(row)
}

func (r *Repository) Create(ctx context.Context, p *plandomain.Plan) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO plans (
		id, name, description, price, currency, billing_period,
		max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id, trm,
		discount_type, discount_value, discount_label, discount_valid_from,
		discount_valid_until, discount_code, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
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
	result, err := r.db.ExecContext(ctx, `UPDATE plans SET
		name = ?, description = ?, price = ?, currency = ?, billing_period = ?,
		max_athletes = ?, max_sessions_per_week = ?, is_active = ?, athlete_count = ?,
		trm = ?, discount_type = ?, discount_value = ?, discount_label = ?,
		discount_valid_from = ?, discount_valid_until = ?, discount_code = ?,
		updated_at = datetime('now')
		WHERE id = ?`,
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
	result, err := r.db.ExecContext(ctx, `DELETE FROM plans WHERE id = ?`, id)
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
