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
//
// Un coach puede tener más de un usuario con el mismo email (datos legacy de
// Clerk). Se deduplica por email para que el CRM muestre una sola fila y se
// prioriza el usuario que ya tiene fila en coaches.
//
// Los joins aceptan tanto users.id (canónico) como coaches.id (legacy) para no
// perder plan, atletas ni pagos de coaches creados antes de unificar ambos IDs.
func (r *Repository) ListCoaches(ctx context.Context) ([]*domain.CoachSummary, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT
			u.id, u.email, u.name, u.role,
			COALESCE(p.plan_name, pc.plan_name) AS plan_name,
			COALESCE(p.plan_price, pc.amount) AS plan_price,
			COALESCE(p.plan_max_athletes, pc.plan_max_athletes, 0) AS plan_max_athletes,
			COALESCE(p.plan_status, CASE WHEN pc.status IN ('paid','claimed') THEN 'active' END) AS plan_status,
			p.plan_expires_at,
			COALESCE(cp.skip_subscription, false) as skip_subscription,
			COALESCE(a.athletes_count, 0) as athletes_count,
			COALESCE(r.revenue_month, 0) as revenue_month,
			COALESCE(r.revenue_total, 0) as revenue_total,
			u.updated_at as last_login
		FROM (
			SELECT DISTINCT ON (CASE WHEN u.email = '' THEN u.id ELSE lower(u.email) END)
			       u.id, u.email, u.name, u.role, u.is_active, u.updated_at
			FROM users u
			WHERE u.role = 'coach'
			ORDER BY CASE WHEN u.email = '' THEN u.id ELSE lower(u.email) END,
			         (EXISTS (SELECT 1 FROM coaches c WHERE c.id = u.id)) DESC,
			         (CASE WHEN u.name = '' OR lower(u.name) = lower(u.email) THEN 1 ELSE 0 END) ASC,
			         u.is_active DESC, u.updated_at DESC, u.id
		) u
		LEFT JOIN LATERAL (
			SELECT c0.skip_subscription
			FROM coaches c0
			WHERE c0.id = u.id OR (c0.email <> '' AND lower(c0.email) = lower(u.email))
			ORDER BY (c0.id = u.id) DESC, c0.updated_at DESC
			LIMIT 1
		) cp ON true
		-- Fallback para coaches que pagaron antes de crear la cuenta: el
		-- checkout queda en pending_checkouts con el plan y el monto.
		LEFT JOIN LATERAL (
			SELECT pc0.plan_name, pc0.amount, pc0.status, pl.max_athletes AS plan_max_athletes
			FROM pending_checkouts pc0
			LEFT JOIN plans pl ON pl.id = pc0.plan_id
			WHERE pc0.email <> ''
			  AND lower(pc0.email) = lower(u.email)
			  AND pc0.status IN ('paid', 'claimed')
			ORDER BY pc0.updated_at DESC
			LIMIT 1
		) pc ON true
		LEFT JOIN LATERAL (
			SELECT COALESCE(NULLIF(s.plan_name, ''), pl.name) AS plan_name,
			       COALESCE(NULLIF(s.plan_price, 0), pl.price) AS plan_price,
			       pl.max_athletes AS plan_max_athletes,
			       s.status AS plan_status,
			       s.current_period_end AS plan_expires_at
			FROM subscriptions s
			LEFT JOIN plans pl ON pl.id = s.plan_id
			WHERE s.athlete_id <> ''
			  AND (
			    s.athlete_id = u.id
			    OR s.athlete_id IN (
			      SELECT u2.id FROM users u2
			      WHERE u2.email <> '' AND lower(u2.email) = lower(u.email)
			    )
			    OR s.athlete_id IN (
			      SELECT c1.id FROM coaches c1
			      WHERE c1.email <> '' AND lower(c1.email) = lower(u.email)
			    )
			  )
			ORDER BY CASE s.status
			           WHEN 'active' THEN 0 WHEN 'trial' THEN 1 WHEN 'past_due' THEN 2 ELSE 3
			         END,
			         s.current_period_end DESC
			LIMIT 1
		) p ON true
		LEFT JOIN LATERAL (
			-- Atletas del roster (coach_athletes) y atletas con cuenta
			-- vinculada (coach_athlete_links). El admin debe ver el total real
			-- y actualizado de atletas que entrena el coach.
			SELECT COUNT(*) AS athletes_count
			FROM (
			  SELECT cal.athlete_id AS athlete_id
			  FROM coach_athlete_links cal
			  WHERE cal.status = 'active'
			    AND (
			      cal.coach_id = u.id
			      OR cal.coach_id IN (
			        SELECT u2.id FROM users u2
			        WHERE u2.email <> '' AND lower(u2.email) = lower(u.email)
			      )
			      OR cal.coach_id IN (
			        SELECT c2.id FROM coaches c2
			        WHERE c2.email <> '' AND lower(c2.email) = lower(u.email)
			      )
			    )
			  UNION
			  SELECT ca.id AS athlete_id
			  FROM coach_athletes ca
			  WHERE (
			    ca.coach_id = u.id
			    OR ca.coach_id IN (
			      SELECT u2.id FROM users u2
			      WHERE u2.email <> '' AND lower(u2.email) = lower(u.email)
			    )
			    OR ca.coach_id IN (
			      SELECT c2.id FROM coaches c2
			      WHERE c2.email <> '' AND lower(c2.email) = lower(u.email)
			    )
			  )
			) roster
		) a ON true
		LEFT JOIN LATERAL (
			SELECT
			  COALESCE(SUM(l.gross_amount_cents/100.0) FILTER (
			    WHERE l.period_start::timestamp >= date_trunc('month', NOW())
			  ), 0) AS revenue_month,
			  COALESCE(SUM(l.gross_amount_cents/100.0), 0) AS revenue_total
			FROM wompi_payment_ledger l
			WHERE l.status NOT IN ('pending', 'reversed')
			  -- El coach es el pagador de su propio plan: athlete_id es el
			  -- subscriber, aunque coach_id haya quedado con un ID legacy.
			  AND (
			    l.athlete_id = u.id
			    OR l.athlete_id IN (
			      SELECT u2.id FROM users u2
			      WHERE u2.email <> '' AND lower(u2.email) = lower(u.email)
			    )
			    OR l.athlete_id IN (
			      SELECT c3.id FROM coaches c3
			      WHERE c3.email <> '' AND lower(c3.email) = lower(u.email)
			    )
			  )
		) r ON true
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
		var athletesCount, planMaxAthletes sql.NullInt64
		var lastLogin sql.NullString
		err := rows.Scan(&c.ID, &c.Email, &c.Name, &c.Role,
			&planName, &planPrice, &planMaxAthletes, &planStatus, &planExpires,
			&c.SkipSubscription,
			&athletesCount, &revenueMonth, &revenueTotal, &lastLogin)
		if err != nil {
			return nil, err
		}
		c.PlanName = planName.String
		if planPrice.Valid {
			c.PlanPrice = planPrice.Float64
		}
		if planMaxAthletes.Valid {
			c.PlanMaxAthletes = int(planMaxAthletes.Int64)
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

// GetRevenueStats devuelve estadísticas de ganancias para el CRM global.
// El super admin suma TODOS los pagos del ledger que no sean pending ni
// reversed, independientemente de coach_id o athlete_id. Si RLS bloquea la
// lectura de wompi_payment_ledger (política de isolación por coach), aplicar
// la migración 427 que permite SELECT sin contexto de coach.
func (r *Repository) GetRevenueStats(ctx context.Context) (*domain.RevenueStats, error) {
	stats := &domain.RevenueStats{}

	// Today
	err := r.exec.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(gross_amount_cents/100.0), 0)
		FROM wompi_payment_ledger
		WHERE status NOT IN ('pending', 'reversed')
		  AND period_start::date = CURRENT_DATE
	`).Scan(&stats.Today)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get today revenue: %w", err)
	}

	// This month
	err = r.exec.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(gross_amount_cents/100.0), 0)
		FROM wompi_payment_ledger
		WHERE status NOT IN ('pending', 'reversed')
		  AND period_start::timestamp >= date_trunc('month', NOW())
	`).Scan(&stats.ThisMonth)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get this month revenue: %w", err)
	}

	// This year
	err = r.exec.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(gross_amount_cents/100.0), 0)
		FROM wompi_payment_ledger
		WHERE status NOT IN ('pending', 'reversed')
		  AND period_start::timestamp >= date_trunc('year', NOW())
	`).Scan(&stats.ThisYear)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get this year revenue: %w", err)
	}

	// Total
	err = r.exec.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(gross_amount_cents/100.0), 0)
		FROM wompi_payment_ledger
		WHERE status NOT IN ('pending', 'reversed')
	`).Scan(&stats.Total)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get total revenue: %w", err)
	}

	// By month (last 12 months)
	rows, err := r.exec.QueryContext(ctx, `
		SELECT to_char(period_start::timestamp, 'YYYY-MM') as month,
		       SUM(gross_amount_cents/100.0) as amount
		FROM wompi_payment_ledger
		WHERE status NOT IN ('pending', 'reversed')
		GROUP BY to_char(period_start::timestamp, 'YYYY-MM')
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
			p.plan_name, p.plan_price, p.status as plan_status,
			p.current_period_end as plan_expires_at,
			COALESCE(a.athletes_count, 0) as athletes_count
		FROM users u
		JOIN subscriptions p ON p.status = 'active'
		  AND (
		    p.athlete_id = u.id
		    OR p.athlete_id IN (
		      SELECT u2.id FROM users u2
		      WHERE u2.email <> '' AND lower(u2.email) = lower(u.email)
		    )
		  )
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
			p.plan_name, p.plan_price, p.status as plan_status,
			p.current_period_end as plan_expires_at,
			COALESCE(a.athletes_count, 0) as athletes_count
		FROM users u
		JOIN subscriptions p ON p.status != 'active'
		  AND (
		    p.athlete_id = u.id
		    OR p.athlete_id IN (
		      SELECT u2.id FROM users u2
		      WHERE u2.email <> '' AND lower(u2.email) = lower(u.email)
		    )
		  )
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
