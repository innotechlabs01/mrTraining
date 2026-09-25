package dashboard

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/dashboard"
)

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) domain.Repository {
	return &repository{db: db}
}

func (r *repository) GetSummary(ctx context.Context, coachID string) (*domain.DashboardSummary, error) {
	// ---- Totals ----
	var totalAthletes, activeAthletes int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*), COUNT(CASE WHEN last_activity_at > NOW() - INTERVAL '30 days' THEN 1 END)
		 FROM athletes WHERE coach_id = $1`, coachID).Scan(&totalAthletes, &activeAthletes)
	if err != nil {
		return nil, fmt.Errorf("total athletes: %w", err)
	}

	// Workouts completed / planned (last 30 days)
	var completed, planned int
	err = r.db.QueryRowContext(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '30 days'),
			COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at > NOW())
		FROM assigned_workouts WHERE coach_id = $1`, coachID).Scan(&completed, &planned)
	if err != nil {
		return nil, fmt.Errorf("workouts: %w", err)
	}

	// Compliance rate (last 30 days)
	var complianceRate float64
	_ = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(
			100.0 * COUNT(*) FILTER (WHERE status = 'completed') /
			NULLIF(COUNT(*) FILTER (WHERE status IN ('completed','scheduled')),0), 0)
		FROM assigned_workouts
		WHERE coach_id = $1 AND scheduled_at > NOW() - INTERVAL '30 days'`, coachID).Scan(&complianceRate)

	// Revenue (cents) – sum of successful purchases last 30 days
	var revenueCents int64
	_ = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(price_cents),0)
		FROM purchases
		WHERE coach_id = $1 AND status = 'succeeded' AND created_at > NOW() - INTERVAL '30 days'`, coachID).Scan(&revenueCents)

	// Upcoming appointments / events (next 7 days)
	var upcomingAppts, upcomingEvents int
	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM appointments
		WHERE coach_id = $1 AND start_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'`, coachID).Scan(&upcomingAppts)
	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM events
		WHERE coach_id = $1 AND date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`, coachID).Scan(&upcomingEvents)

	// Recent activity (last 10 items)
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, type, title, description, athlete_name, occurred_at
		FROM activity_log
		WHERE coach_id = $1
		ORDER BY occurred_at DESC LIMIT 10`, coachID)
	if err != nil {
		return nil, fmt.Errorf("activity log: %w", err)
	}
	defer rows.Close()
	var activities []domain.ActivityItem
	for rows.Next() {
		var a domain.ActivityItem
		if err = rows.Scan(&a.ID, &a.Type, &a.Title, &a.Description, &a.AthleteName, &a.OccurredAt); err != nil {
			return nil, fmt.Errorf("failed to scan activity: %w", err)
		}
		activities = append(activities, a)
	}

	summary := &domain.DashboardSummary{
		TotalAthletes:        totalAthletes,
		ActiveAthletes:       activeAthletes,
		WorkoutsCompleted:    completed,
		WorkoutsPlanned:      planned,
		ComplianceRate:       complianceRate,
		AverageCompliance:    complianceRate, // same metric for now
		RevenueCents:         revenueCents,
		UpcomingAppointments: upcomingAppts,
		UpcomingEvents:       upcomingEvents,
		RecentActivity:       activities,
		GeneratedAt:          time.Now().UTC(),
	}
	return summary, nil
}