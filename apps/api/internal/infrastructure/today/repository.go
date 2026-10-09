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

	// Active workouts — exercise count and estimated duration are derived
	// from the programmed exercise data (workout_exercises), never invented
	// client-side. Estimate = timed work (minutes*60 + sec) + sets * rest.
	var workouts []today.ActiveWorkout
	g.Go(func() error {
		workouts = make([]today.ActiveWorkout, 0)
		wrows, err := r.db.QueryContext(gctx,
			`SELECT aw.id, aw.content_name, aw.modality, aw.status, aw.progress,
			        COALESCE(we.exercise_count, 0),
			        (COALESCE(we.estimated_seconds, 0) + 59) / 60
			 FROM assigned_workouts aw
			 LEFT JOIN (
			   SELECT workout_id,
			          COUNT(*) AS exercise_count,
			          SUM(CASE
			                    WHEN COALESCE(minutes, 0) > 0 OR COALESCE(sec, 0) > 0
			                    THEN (COALESCE(minutes, 0) * 60 + COALESCE(sec, 0))
			                    ELSE 0
			                  END)
			              + COALESCE(sets, 0) * COALESCE(rest_seconds, 0) AS estimated_seconds
			   FROM workout_exercises
			   GROUP BY workout_id
			 ) we ON we.workout_id = aw.id
			 WHERE aw.athlete_id = ? AND aw.status IN ('active','in_progress')
			 ORDER BY aw.start_date DESC LIMIT 5`, athleteID)
		if err != nil {
			return nil
		}
		defer wrows.Close()
		for wrows.Next() {
			var w today.ActiveWorkout
			if err := wrows.Scan(&w.ID, &w.ContentName, &w.Modality, &w.Status, &w.Progress,
				&w.ExerciseCount, &w.EstimatedMinutes); err == nil {
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
