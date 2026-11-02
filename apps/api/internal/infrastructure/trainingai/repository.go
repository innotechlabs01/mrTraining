// Package trainingai implements the trainingai.Repository over SQL (Turso/libsql).
package trainingai

import (
	"context"
	"database/sql"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/trainingai"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements domain.Repository using database/sql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a trainingai repository with the given database handle.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetWorkoutAthlete returns the athlete id the assigned workout belongs to.
func (r *Repository) GetWorkoutAthlete(ctx context.Context, workoutID string) (string, error) {
	var athleteID string
	err := r.db.QueryRowContext(ctx,
		`SELECT athlete_id FROM assigned_workouts WHERE id = $1`, workoutID).Scan(&athleteID)
	if err == sql.ErrNoRows {
		return "", errors.NotFound("AssignedWorkout", workoutID)
	}
	if err != nil {
		return "", fmt.Errorf("get workout athlete: %w", err)
	}
	return athleteID, nil
}

// GetWorkoutExercises returns the prescribed exercises of an assigned workout.
func (r *Repository) GetWorkoutExercises(ctx context.Context, workoutID string) ([]domain.WorkoutExercise, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, COALESCE(sets, 0), COALESCE(reps, 0),
		        COALESCE(weight_kg, 0), COALESCE(rest_seconds, 0)
		 FROM workout_exercises
		 WHERE workout_id = $2
		 ORDER BY sort_order ASC, id ASC`, workoutID)
	if err != nil {
		return nil, fmt.Errorf("get workout exercises: %w", err)
	}
	defer rows.Close()

	var out []domain.WorkoutExercise
	for rows.Next() {
		var e domain.WorkoutExercise
		if err := rows.Scan(&e.ID, &e.Name, &e.Sets, &e.Reps, &e.WeightKg, &e.RestSeconds); err != nil {
			return nil, fmt.Errorf("scan workout exercise: %w", err)
		}
		out = append(out, e)
	}
	return out, nil
}

// GetExerciseHistory returns the last `limit` dated best sets for an athlete
// and exercise name. Exercises are matched by name because workout_exercises
// rows (and therefore set logs' exercise_id) are per assigned workout.
func (r *Repository) GetExerciseHistory(ctx context.Context, athleteID, exerciseName string, limit int) ([]domain.SetHistoryEntry, error) {
	if limit <= 0 || limit > 50 {
		limit = 8
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT DATE(wset.logged_at) AS d,
		        MAX(wset.weight_kg) AS best_weight,
		        MAX(wset.reps) AS best_reps
		 FROM workout_set_logs wset
		 JOIN workout_session_logs wsl ON wsl.id = wset.session_id
		 JOIN workout_exercises we ON we.id = wset.exercise_id
		 WHERE wsl.athlete_id = $3
		   AND LOWER(TRIM(we.name)) = LOWER(TRIM($4))
		   AND wset.completed = 1
		   AND wset.weight_kg > 0
		   AND wset.reps > 0
		 GROUP BY d
		 ORDER BY d DESC
		 LIMIT $5`, athleteID, exerciseName, limit)
	if err != nil {
		return nil, fmt.Errorf("get exercise history: %w", err)
	}
	defer rows.Close()

	var out []domain.SetHistoryEntry
	for rows.Next() {
		var e domain.SetHistoryEntry
		if err := rows.Scan(&e.Date, &e.Weight, &e.Reps); err != nil {
			return nil, fmt.Errorf("scan exercise history: %w", err)
		}
		out = append(out, e)
	}
	return out, nil
}

// GetExerciseLoadByDay returns load (weight*reps) per date for the last 7 days.
func (r *Repository) GetExerciseLoadByDay(ctx context.Context, athleteID, exerciseName string) (map[string]float64, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT DATE(wset.logged_at) AS d,
		        COALESCE(SUM(wset.weight_kg * wset.reps), 0)
		 FROM workout_set_logs wset
		 JOIN workout_session_logs wsl ON wsl.id = wset.session_id
		 JOIN workout_exercises we ON we.id = wset.exercise_id
		 WHERE wsl.athlete_id = $6
		   AND LOWER(TRIM(we.name)) = LOWER(TRIM($7))
		   AND wset.completed = 1
		   AND DATE(wset.logged_at) >= DATE('now', '-7 days')
		 GROUP BY d`, athleteID, exerciseName)
	if err != nil {
		return nil, fmt.Errorf("get exercise load: %w", err)
	}
	defer rows.Close()

	out := make(map[string]float64)
	for rows.Next() {
		var date string
		var load float64
		if err := rows.Scan(&date, &load); err != nil {
			return nil, fmt.Errorf("scan exercise load: %w", err)
		}
		out[date] = load
	}
	return out, nil
}
