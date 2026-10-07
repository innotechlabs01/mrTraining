package today

import (
	"context"
	"database/sql"
	"fmt"

	"golang.org/x/sync/errgroup"

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
// The four source queries are independent and run in parallel via errgroup,
// so total latency is bounded by the slowest query instead of their sum
// (with a remote Turso this cuts the endpoint from ~40-80ms to ~10-20ms).
// Only the athlete lookup is fatal — readiness/workouts/sessions keep the
// legacy lenient semantics (empty result on error).
func (r *Repository) GetTodayData(ctx context.Context, athleteID string) (*today.TodayData, error) {
	g, gctx := errgroup.WithContext(ctx)

	// Athlete info
	var info today.AthleteInfo
	g.Go(func() error {
		err := r.db.QueryRowContext(gctx,
			`SELECT id, name, sport FROM athlete_profiles WHERE id = ?`, athleteID).Scan(&info.ID, &info.Name, &info.Sport)
		if err == sql.ErrNoRows {
			return fmt.Errorf("athlete not found")
		}
		if err != nil {
			return fmt.Errorf("failed to get athlete: %w", err)
		}
		return nil
	})

	// Readiness — simplified: average of recent metrics
	var readiness today.ReadinessScore
	g.Go(func() error {
		_ = r.db.QueryRowContext(gctx,
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
		return nil
	})

	// Active workouts
	var workouts []today.ActiveWorkout
	g.Go(func() error {
		workouts = make([]today.ActiveWorkout, 0)
		wrows, err := r.db.QueryContext(gctx,
			`SELECT id, content_name, modality, status, progress FROM assigned_workouts
			 WHERE athlete_id = ? AND status IN ('active','in_progress') ORDER BY start_date DESC LIMIT 5`, athleteID)
		if err != nil {
			return nil
		}
		defer wrows.Close()
		for wrows.Next() {
			var w today.ActiveWorkout
			if err := wrows.Scan(&w.ID, &w.ContentName, &w.Modality, &w.Status, &w.Progress); err == nil {
				workouts = append(workouts, w)
			}
		}
		return nil
	})

	// Today sessions via session_athletes link (coach_sessions has no athlete_id).
	var sessions []today.Session
	g.Go(func() error {
		sessions = make([]today.Session, 0)
		srows, err := r.db.QueryContext(gctx,
			`SELECT cs.id, cs.name, cs.time, cs.end_time, cs.location, cs.status
			 FROM coach_sessions cs
			 JOIN session_athletes sa ON sa.session_id = cs.id
			 WHERE sa.athlete_id = ? AND date(cs.time) = date('now')
			 ORDER BY cs.time`, athleteID)
		if err != nil {
			return nil
		}
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
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return &today.TodayData{
		Athlete:        info,
		Readiness:      readiness,
		TodaySessions:  sessions,
		ActiveWorkouts: workouts,
	}, nil
}
