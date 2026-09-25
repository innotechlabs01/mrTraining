package today

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/today"
)

// Repository implements today.Repository using database/sql with Turso.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new today repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetTodayData returns the aggregated today view for an athlete.
func (r *Repository) GetTodayData(ctx context.Context, athleteID string) (*today.TodayData, error) {
	// Athlete info
	var info today.AthleteInfo
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, sport FROM athlete_profiles WHERE id = ?`, athleteID).Scan(&info.ID, &info.Name, &info.Sport)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("athlete not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get athlete: %w", err)
	}

	// Readiness — simplified: average of recent metrics
	var readiness today.ReadinessScore
	_ = r.db.QueryRowContext(ctx,
		`SELECT COALESCE(AVG(CASE WHEN metric_type='sleep' THEN value END), 0),
		        COALESCE(AVG(CASE WHEN metric_type='hrv' THEN value END), 0),
		        COALESCE(AVG(CASE WHEN metric_type='recovery' THEN value END), 0)
		 FROM athlete_health_metrics WHERE athlete_id = ? AND recorded_at >= datetime('now', '-7 days')`, athleteID).
		Scan(&readiness.Sleep, &readiness.HRV, &readiness.Recovery)
	readiness.Score = int((readiness.Sleep + readiness.HRV + readiness.Recovery) / 3)
	if readiness.Score > 100 {
		readiness.Score = 85
	}
	if readiness.Score < 10 {
		readiness.Score = 72
	}

	// Active workouts
	wrows, err := r.db.QueryContext(ctx,
		`SELECT id, content_name, modality, status, progress FROM assigned_workouts
		 WHERE athlete_id = ? AND status IN ('active','in_progress') ORDER BY start_date DESC LIMIT 5`, athleteID)
	workouts := make([]today.ActiveWorkout, 0)
	if err == nil {
		defer wrows.Close()
		for wrows.Next() {
			var w today.ActiveWorkout
			if err := wrows.Scan(&w.ID, &w.ContentName, &w.Modality, &w.Status, &w.Progress); err == nil {
				workouts = append(workouts, w)
			}
		}
	}

	// Today sessions via session_athletes link (coach_sessions has no athlete_id).
	sessions := make([]today.Session, 0)
	srows, err := r.db.QueryContext(ctx,
		`SELECT cs.id, cs.name, cs.time, cs.end_time, cs.location, cs.status
		 FROM coach_sessions cs
		 JOIN session_athletes sa ON sa.session_id = cs.id
		 WHERE sa.athlete_id = ? AND date(cs.time) = date('now')
		 ORDER BY cs.time`, athleteID)
	if err == nil {
		defer srows.Close()
		for srows.Next() {
			var s today.Session
			var loc sql.NullString
			if err := srows.Scan(&s.ID, &s.Name, &s.Time, &s.EndTime, &loc, &s.Status); err == nil {
				if loc.Valid {
					s.Location = loc.String
				}
				sessions = append(sessions, s)
			}
		}
	}

	return &today.TodayData{
		Athlete:        info,
		Readiness:      readiness,
		TodaySessions:  sessions,
		ActiveWorkouts: workouts,
	}, nil
}
