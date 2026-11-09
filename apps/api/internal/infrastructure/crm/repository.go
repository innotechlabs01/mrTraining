// Package crm implementa el repositorio de CRM usando PostgreSQL.
// RLS: super admin puede ver todos los coaches.
package crm

import (
	"context"
	"database/sql"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/application/crm"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implementa domain.Repository usando PostgreSQL.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository crea un nuevo repositorio CRM.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor inyecta un executor SQL.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor devuelve una nueva instancia compartiendo el pool.
func (r *Repository) WithExecutor(exec database.Executor) domain.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reporta si el executor es un *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// ListCoaches devuelve todos los coaches con su plan y estado.
func (r *Repository) ListCoaches(ctx context.Context) ([]*domain.CoachSummary, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT
			u.id, u.email, u.name, u.role,
			p.name as plan_name, p.price as plan_price, p.status as plan_status,
			p.current_period_end as plan_expires_at,
			COALESCE(a.athletes_count, 0) as athletes_count,
			COALESCE(r.revenue_month, 0) as revenue_month,
			COALESCE(r.revenue_total, 0) as revenue_total,
			u.updated_at as last_login
		FROM users u
		LEFT JOIN (
			SELECT coach_id, name as plan_name, price as plan_price, status,
			       current_period_end
			FROM subscriptions
			WHERE status = 'active'
			ORDER BY current_period_end DESC
		) p ON p.coach_id = u.id
		LEFT JOIN (
			SELECT coach_id, COUNT(*) as athletes_count
			FROM coach_athlete_links
			WHERE status = 'active'
			GROUP BY coach_id
		) a ON a.coach_id = u.id
		LEFT JOIN (
			SELECT coach_id,
			       SUM(CASE WHEN period_start >= date_trunc('month', NOW()) THEN gross_amount_cents/100.0 ELSE 0 END) as revenue_month,
			       SUM(gross_amount_cents/100.0) as revenue_total
			FROM wompi_payment_ledger
			WHERE status = 'approved'
			GROUP BY coach_id
		) r ON r.coach_id = u.id
		WHERE u.role = 'coach'
		ORDER BY u.name
	`)
	if err != nil {
		return nil, fmt.Errorf("list coaches: %w", err)
	}
	defer rows.Close()

	out := []*domain.CoachSummary{}
	for rows.Next() {
		var c domain.CoachSummary
		var planName, planStatus, planExpires sql.NullString
		var planPrice, revenueMonth, revenueTotal sql.NullFloat64
		var athletesCount sql.NullInt64
		var lastLogin sql.NullString
		err := rows.Scan(&c.ID, &c.Email, &c.Name, &c.Role,
			&planName, &planPrice, &planStatus, &planExpires,
			&athletesCount, &revenueMonth, &revenueTotal, &lastLogin)
		if err != nil {
			return nil, err
		}
		c.PlanName = planName.String
		if planPrice.Valid {
			c.PlanPrice = planPrice.Float64
		}
		c.PlanStatus = planStatus.String
		if planExpires.Valid {
			c.PlanExpiresAt = planExpires.String
		}
		if athletesCount.Valid {
			c.AthletesCount = int(athletesCount.Int64)
		}
		if revenueMonth.Valid {
			c.RevenueMonth = revenueMonth.Float64
		}
		if revenueTotal.Valid {
			c.RevenueTotal = revenueTotal.Float64
		}
		if lastLogin.Valid {
			c.LastLogin = lastLogin.String
		}
		out = append(out, &c)
	}
	return out, rows.Err()
}

// GetRevenueStats devuelve estadísticas de ganancias.
func (r *Repository) GetRevenueStats(ctx context.Context) (*domain.RevenueStats, error) {
	stats := &domain.RevenueStats{}

	// Today
	err := r.exec.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(gross_amount_cents/100.0), 0)
		FROM wompi_payment_ledger
		WHERE status = 'approved'
		  AND period_start::date = CURRENT_DATE
	`).Scan(&stats.Today)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get today revenue: %w", err)
	}

	// This month
	err = r.exec.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(gross_amount_cents/100.0), 0)
		FROM wompi_payment_ledger
		WHERE status = 'approved'
		  AND period_start >= date_trunc('month', NOW())
	`).Scan(&stats.ThisMonth)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get this month revenue: %w", err)
	}

	// This year
	err = r.exec.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(gross_amount_cents/100.0), 0)
		FROM wompi_payment_ledger
		WHERE status = 'approved'
		  AND period_start >= date_trunc('year', NOW())
	`).Scan(&stats.ThisYear)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get this year revenue: %w", err)
	}

	// Total
	err = r.exec.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(gross_amount_cents/100.0), 0)
		FROM wompi_payment_ledger
		WHERE status = 'approved'
	`).Scan(&stats.Total)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get total revenue: %w", err)
	}

	// By month (last 12 months)
	rows, err := r.exec.QueryContext(ctx, `
		SELECT to_char(period_start, 'YYYY-MM') as month,
		       SUM(gross_amount_cents/100.0) as amount
		FROM wompi_payment_ledger
		WHERE status = 'approved'
		  AND period_start >= date_trunc('year', NOW()) - interval '11 months'
		GROUP BY to_char(period_start, 'YYYY-MM')
		ORDER BY month
	`)
	if err != nil {
		return nil, fmt.Errorf("get monthly revenue: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var mr domain.MonthRevenue
		if err := rows.Scan(&mr.Month, &mr.Amount); err != nil {
			return nil, err
		}
		stats.ByMonth = append(stats.ByMonth, mr)
	}

	return stats, nil
}

// GetCoachPayments devuelve el historial de pagos de un coach.
func (r *Repository) GetCoachPayments(ctx context.Context, coachID string) ([]*domain.CoachPayment, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT
			s.id, s.athlete_id, u.name as athlete_name,
			s.coach_id, p.name as plan_name,
			l.gross_amount_cents/100.0 as amount,
			l.currency, l.status,
			l.period_start, l.period_end
		FROM wompi_payment_ledger l
		JOIN subscriptions s ON s.id = l.subscription_id
		JOIN users u ON u.id = s.athlete_id
		JOIN plans p ON p.id = s.plan_id
		WHERE l.coach_id = $1 AND l.status = 'approved'
		ORDER BY l.created_at DESC
	`, coachID)
	if err != nil {
		return nil, fmt.Errorf("get coach payments: %w", err)
	}
	defer rows.Close()

	out := []*domain.CoachPayment{}
	for rows.Next() {
		var p domain.CoachPayment
		var athleteName, planName sql.NullString
		var periodStart, periodEnd sql.NullString
		err := rows.Scan(&p.ID, &p.AthleteID, &athleteName,
			&p.CoachID, &planName, &p.Amount, &p.Currency,
			&p.Status, &periodStart, &periodEnd)
		if err != nil {
			return nil, err
		}
		if athleteName.Valid {
			p.AthleteName = athleteName.String
		}
		if planName.Valid {
			p.PlanName = planName.String
		}
		if periodStart.Valid {
			p.PeriodStart = periodStart.String
		}
		if periodEnd.Valid {
			p.PeriodEnd = periodEnd.String
		}
		out = append(out, &p)
	}
	return out, rows.Err()
}

// GetExpiringCoaches devuelve coaches con plan por vencer (7 días).
func (r *Repository) GetExpiringCoaches(ctx context.Context) ([]*domain.CoachSummary, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT u.id, u.email, u.name, u.role,
			p.name as plan_name, p.price as plan_price,
			p.current_period_end as plan_expires_at,
			COALESCE(a.athletes_count, 0) as athletes_count
		FROM users u
		JOIN subscriptions p ON p.coach_id = u.id AND p.status = 'active'
		LEFT JOIN (
			SELECT coach_id, COUNT(*) as athletes_count
			FROM coach_athlete_links WHERE status = 'active'
			GROUP BY coach_id
		) a ON a.coach_id = u.id
		WHERE u.role = 'coach'
		  AND p.current_period_end BETWEEN NOW() AND NOW() + interval '7 days'
		ORDER BY p.current_period_end
	`)
	if err != nil {
		return nil, fmt.Errorf("get expiring coaches: %w", err)
	}
	defer rows.Close()

	out := []*domain.CoachSummary{}
	for rows.Next() {
		var c domain.CoachSummary
		var planName, planStatus, planExpires sql.NullString
		var planPrice sql.NullFloat64
		var athletesCount sql.NullInt64
		err := rows.Scan(&c.ID, &c.Email, &c.Name, &c.Role,
			&planName, &planPrice, &planStatus, &planExpires, &athletesCount)
		if err != nil {
			return nil, err
		}
		c.PlanName = planName.String
		if planPrice.Valid {
			c.PlanPrice = planPrice.Float64
		}
		c.PlanStatus = planStatus.String
		if planExpires.Valid {
			c.PlanExpiresAt = planExpires.String
		}
		if athletesCount.Valid {
			c.AthletesCount = int(athletesCount.Int64)
		}
		out = append(out, &c)
	}
	return out, rows.Err()
}

// GetExpiredCoaches devuelve coaches con plan vencido.
func (r *Repository) GetExpiredCoaches(ctx context.Context) ([]*domain.CoachSummary, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT u.id, u.email, u.name, u.role,
			p.name as plan_name, p.price as plan_price, p.status as plan_status,
			p.current_period_end as plan_expires_at,
			COALESCE(a.athletes_count, 0) as athletes_count
		FROM users u
		JOIN subscriptions p ON p.coach_id = u.id AND p.status != 'active'
		LEFT JOIN (
			SELECT coach_id, COUNT(*) as athletes_count
			FROM coach_athlete_links WHERE status = 'active'
			GROUP BY coach_id
		) a ON a.coach_id = u.id
		WHERE u.role = 'coach'
		  AND p.current_period_end < NOW()
		ORDER BY p.current_period_end
	`)
	if err != nil {
		return nil, fmt.Errorf("get expired coaches: %w", err)
	}
	defer rows.Close()

	out := []*domain.CoachSummary{}
	for rows.Next() {
		var c domain.CoachSummary
		var planName, planStatus, planExpires sql.NullString
		var planPrice sql.NullFloat64
		var athletesCount sql.NullInt64
		err := rows.Scan(&c.ID, &c.Email, &c.Name, &c.Role,
			&planName, &planPrice, &planStatus, &planExpires, &athletesCount)
		if err != nil {
			return nil, err
		}
		c.PlanName = planName.String
		if planPrice.Valid {
			c.PlanPrice = planPrice.Float64
		}
		c.PlanStatus = planStatus.String
		if planExpires.Valid {
			c.PlanExpiresAt = planExpires.String
		}
		if athletesCount.Valid {
			c.AthletesCount = int(athletesCount.Int64)
		}
		out = append(out, &c)
	}
	return out, rows.Err()
}
