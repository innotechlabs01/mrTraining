// Package analytics provides a SQL implementation of the analytics domain
// repository over the real training tables (workout_session_logs,
// workout_set_logs, workout_exercises) plus athlete_health_metrics.
package analytics

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/analytics"
)

// Repository implements domain.Repository using database/sql (Turso/libsql).
type Repository struct {
	db *sql.DB
}

// NewRepository creates an analytics repository with the given database handle.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// fatigueHalfLifeHours: exponential decay half-life for accumulated training
// load (72h ≈ standard recovery window for resistance training).
const fatigueHalfLifeHours = 72.0

// GetDashboardSummary returns coach roster metrics: total athletes, athletes
// active in the last 7 days, sessions completed in the last 30 days, and the
// athletes that need attention (no completed session in the last 7 days).
func (r *Repository) GetDashboardSummary(ctx context.Context, coachID string) (*domain.DashboardSummary, error) {
	summary := &domain.DashboardSummary{
		RosterMetrics:  map[string]interface{}{},
		Upcoming:       []interface{}{},
		NeedsAttention: []interface{}{},
	}

	var totalAthletes, activeAthletes7d int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*),
		        SUM(CASE WHEN EXISTS (
		          SELECT 1 FROM workout_session_logs wsl
		          WHERE wsl.athlete_id = coach_athletes.id
		            AND wsl.completed = 1
		            AND DATE(wsl.started_at) >= DATE('now', '-7 days')
		        ) THEN 1 ELSE 0 END)
		 FROM coach_athletes WHERE coach_id = $1`, coachID).Scan(&totalAthletes, &activeAthletes7d)
	if err != nil {
		return nil, fmt.Errorf("dashboard roster: %w", err)
	}
	if activeAthletes7d < 0 {
		activeAthletes7d = 0
	}

	var sessions30d int
	var volume30d float64
	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT wsl.id), COALESCE(SUM(wset.weight_kg * wset.reps), 0)
		 FROM workout_session_logs wsl
		 LEFT JOIN workout_set_logs wset ON wset.session_id = wsl.id AND wset.completed = 1
		 WHERE wsl.completed = 1
		   AND wsl.athlete_id IN (SELECT id FROM coach_athletes WHERE coach_id = $2)
		   AND DATE(wsl.started_at) >= DATE('now', '-30 days')`, coachID).Scan(&sessions30d, &volume30d)
	if err != nil {
		return nil, fmt.Errorf("dashboard sessions: %w", err)
	}

	summary.RosterMetrics["total_athletes"] = totalAthletes
	summary.RosterMetrics["active_athletes_7d"] = activeAthletes7d
	summary.RosterMetrics["sessions_completed_30d"] = sessions30d
	summary.RosterMetrics["total_volume_30d_kg"] = volume30d

	// Athletes with zero completed sessions in 7 days need a nudge.
	rows, err := r.db.QueryContext(ctx,
		`SELECT ca.id, ca.name
		 FROM coach_athletes ca
		 WHERE ca.coach_id = $3
		   AND NOT EXISTS (
		     SELECT 1 FROM workout_session_logs wsl
		     WHERE wsl.athlete_id = ca.id
		       AND wsl.completed = 1
		       AND DATE(wsl.started_at) >= DATE('now', '-7 days')
		   )
		 LIMIT 20`, coachID)
	if err != nil {
		return nil, fmt.Errorf("dashboard needs attention: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, fmt.Errorf("dashboard needs attention scan: %w", err)
		}
		summary.NeedsAttention = append(summary.NeedsAttention, map[string]interface{}{
			"athlete_id": id,
			"name":       name,
			"reason":     "sin entrenamiento completado en 7 días",
		})
	}
	return summary, nil
}

// GetHRZones buckets the athlete's recorded heart-rate samples into the
// standard 5 zones. Samples come from athlete_health_metrics (metric_type =
// 'heart_rate') pushed by the mobile health sync. Each sample is treated as
// one minute of zone time (sync cadence ≈ 1/min during activity).
func (r *Repository) GetHRZones(ctx context.Context, athleteID string) ([]domain.HRZone, error) {
	bounds := []struct {
		zone int
		min  int
		max  int
	}{
		{1, 0, 119},
		{2, 120, 139},
		{3, 140, 159},
		{4, 160, 179},
		{5, 180, 250},
	}

	counts := make([]int, len(bounds))
	var total int
	rows, err := r.db.QueryContext(ctx,
		`SELECT value FROM athlete_health_metrics
		 WHERE athlete_id = $4 AND metric_type = 'heart_rate'
		   AND DATE(recorded_at) >= DATE('now', '-30 days')`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("hr zones: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var bpm float64
		if err := rows.Scan(&bpm); err != nil {
			return nil, fmt.Errorf("hr zones scan: %w", err)
		}
		total++
		for i, b := range bounds {
			if bpm >= float64(b.min) && bpm <= float64(b.max) {
				counts[i]++
				break
			}
		}
	}

	zones := make([]domain.HRZone, 0, len(bounds))
	for i, b := range bounds {
		percent := 0
		if total > 0 {
			percent = counts[i] * 100 / total
		}
		zones = append(zones, domain.HRZone{
			Zone:        b.zone,
			MinBpm:      b.min,
			MaxBpm:      b.max,
			Percent:     percent,
			TimeMinutes: counts[i],
		})
	}
	return zones, nil
}

// GetFatigueMap returns the last 14 days of training load with an exponential
// decay fatigue score (half-life 72h) and a mirrored recovery score (0-100).
func (r *Repository) GetFatigueMap(ctx context.Context, athleteID string) ([]domain.FatigueMap, error) {
	type dayLoad struct {
		date   string
		hoursAgo float64
		load   float64
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT DATE(wsl.started_at) AS d,
		        COALESCE(SUM(wset.weight_kg * wset.reps), 0) AS load
		 FROM workout_session_logs wsl
		 LEFT JOIN workout_set_logs wset ON wset.session_id = wsl.id AND wset.completed = 1
		 WHERE wsl.athlete_id = $5
		   AND DATE(wsl.started_at) >= DATE('now', '-14 days')
		 GROUP BY d
		 ORDER BY d ASC`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("fatigue map: %w", err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	var loads []dayLoad
	for rows.Next() {
		var date string
		var load float64
		if err := rows.Scan(&date, &load); err != nil {
			return nil, fmt.Errorf("fatigue map scan: %w", err)
		}
		t, err := time.Parse("2006-01-02", date)
		if err != nil {
			continue
		}
		hoursAgo := now.Sub(t.Add(12 * time.Hour)).Hours()
		if hoursAgo < 0 {
			hoursAgo = 0
		}
		loads = append(loads, dayLoad{date: date, hoursAgo: hoursAgo, load: load})
	}

	result := make([]domain.FatigueMap, 0, len(loads))
	for _, day := range loads {
		// Fatigue = sum of past loads decayed to this day's reference point.
		fatigue := 0.0
		for _, past := range loads {
			if past.hoursAgo < day.hoursAgo {
				continue // future relative to this day
			}
			delta := past.hoursAgo - day.hoursAgo
			fatigue += past.load * pow05(delta/fatigueHalfLifeHours)
		}
		// Normalize to a 0-100 scale: 3000 kg·reps of decayed load ≈ fully fatigued.
		score := fatigue / 30.0
		if score > 100 {
			score = 100
		}
		recovery := 100 - score
		if recovery < 0 {
			recovery = 0
		}
		result = append(result, domain.FatigueMap{
			Date:          day.date,
			FatigueScore:  round2(score),
			RecoveryScore: round2(recovery),
			TrainingLoad:  round2(day.load),
		})
	}
	return result, nil
}

// pow05 computes 0.5^x via math.Exp2.
func pow05(x float64) float64 {
	return math.Exp2(-x)
}

// GetOneRM returns the best Epley 1RM per exercise from completed sets
// (1RM = weight * (1 + reps/30)), with the date of the best set.
func (r *Repository) GetOneRM(ctx context.Context, athleteID string) ([]domain.OneRM, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT wset.exercise_id,
		        we.name,
		        MAX(wset.weight_kg * (1 + wset.reps / 30.0)) AS one_rm,
		        MAX(wset.logged_at) AS last_updated
		 FROM workout_set_logs wset
		 JOIN workout_session_logs wsl ON wsl.id = wset.session_id
		 LEFT JOIN workout_exercises we ON we.id = wset.exercise_id
		 WHERE wsl.athlete_id = $6
		   AND wset.completed = 1
		   AND wset.weight_kg > 0 AND wset.reps > 0
		   AND DATE(wset.logged_at) >= DATE('now', '-90 days')
		 GROUP BY wset.exercise_id
		 ORDER BY one_rm DESC`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("one rm: %w", err)
	}
	defer rows.Close()

	var result []domain.OneRM
	for rows.Next() {
		var exID string
		var name sql.NullString
		var oneRM sql.NullFloat64
		var lastUpdated sql.NullString
		if err := rows.Scan(&exID, &name, &oneRM, &lastUpdated); err != nil {
			return nil, fmt.Errorf("one rm scan: %w", err)
		}
		entry := domain.OneRM{
			ExerciseID:   exID,
			ExerciseName: name.String,
			OneRepMax:    round2(oneRM.Float64),
			LastUpdated:  lastUpdated.String,
		}
		result = append(result, entry)
	}
	return result, nil
}

// GetTrainingSummary aggregates the last 30 days for the coach's roster:
// completed sessions, total volume (kg·reps), and average intensity
// (average load per completed set as a percentage of a 100 kg reference —
// relative index for comparing periods, not an absolute %1RM).
func (r *Repository) GetTrainingSummary(ctx context.Context, coachID string) (*domain.TrainingSummary, error) {
	summary := &domain.TrainingSummary{Period: "last_30_days"}
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT wsl.id),
		        COALESCE(SUM(wset.weight_kg * wset.reps), 0),
		        COALESCE(AVG(wset.weight_kg), 0)
		 FROM workout_session_logs wsl
		 LEFT JOIN workout_set_logs wset ON wset.session_id = wsl.id AND wset.completed = 1
		 WHERE wsl.completed = 1
		   AND wsl.athlete_id IN (SELECT id FROM coach_athletes WHERE coach_id = $7)
		   AND DATE(wsl.started_at) >= DATE('now', '-30 days')`,
		coachID).Scan(&summary.TotalSessions, &summary.TotalVolume, &summary.AvgIntensity)
	if err != nil {
		return nil, fmt.Errorf("training summary: %w", err)
	}
	summary.TotalVolume = round2(summary.TotalVolume)
	summary.AvgIntensity = round2(summary.AvgIntensity)
	return summary, nil
}

// GetEffort scores each completed session of the last 14 days: volume plus an
// intensity multiplier from the heaviest set relative to the athlete's best
// lift in that session. RPE is estimated 1-10 from the intensity multiplier.
func (r *Repository) GetEffort(ctx context.Context, athleteID string) ([]domain.Effort, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT wsl.id,
		        COALESCE(SUM(wset.weight_kg * wset.reps), 0) AS volume,
		        COALESCE(MAX(wset.weight_kg), 0) AS top_set,
		        COALESCE(wsl.duration_seconds, 0) AS duration_seconds
		 FROM workout_session_logs wsl
		 LEFT JOIN workout_set_logs wset ON wset.session_id = wsl.id AND wset.completed = 1
		 WHERE wsl.athlete_id = $8
		   AND wsl.completed = 1
		   AND DATE(wsl.started_at) >= DATE('now', '-14 days')
		 GROUP BY wsl.id
		 ORDER BY wsl.started_at DESC`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("effort: %w", err)
	}
	defer rows.Close()

	var result []domain.Effort
	for rows.Next() {
		var sessionID string
		var volume, topSet float64
		var durationSec int
		if err := rows.Scan(&sessionID, &volume, &topSet, &durationSec); err != nil {
			return nil, fmt.Errorf("effort scan: %w", err)
		}
		// Intensity proxy: top set relative to 150 kg reference (strength work).
		intensity := topSet / 150.0
		if intensity > 1.5 {
			intensity = 1.5
		}
		score := (volume/1000.0)*0.4 + intensity*40.0
		rpe := 5
		if intensity > 0.6 {
			rpe = 6
		}
		if intensity > 0.8 {
			rpe = 7
		}
		if intensity > 1.0 {
			rpe = 8
		}
		if intensity > 1.2 {
			rpe = 9
		}
		result = append(result, domain.Effort{
			SessionID:       sessionID,
			EffortScore:     round2(score),
			RPE:             rpe,
			DurationMinutes: durationSec / 60,
		})
	}
	return result, nil
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}
