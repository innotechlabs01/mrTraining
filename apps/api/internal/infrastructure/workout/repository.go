package workout

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/workout"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements workout.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new workout repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetByID retrieves a workout template by its unique identifier,
// including all associated exercises.
func (r *Repository) GetByID(ctx context.Context, id string) (*workout.WorkoutTemplate, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, coach_id, name, description, goal, estimated_duration_minutes,
		 created_at, updated_at
		 FROM workout_templates WHERE id = ?`, id)

	t := &workout.WorkoutTemplate{}
	var estimatedDuration sql.NullInt64
	err := row.Scan(&t.ID, &t.CoachID, &t.Name, &t.Description, &t.Goal,
		&estimatedDuration, &t.CreatedAt, &t.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("WorkoutTemplate", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get workout template: %w", err)
	}
	if estimatedDuration.Valid {
		d := int(estimatedDuration.Int64)
		t.EstimatedDurationMinutes = &d
	}

	// Load exercises
	exercises, err := r.getExercises(ctx, id)
	if err != nil {
		return nil, err
	}
	t.Exercises = exercises

	return t, nil
}

// ListByCoach retrieves all workout templates for a specific coach.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*workout.WorkoutTemplate, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, coach_id, name, description, goal, estimated_duration_minutes,
		 created_at, updated_at
		 FROM workout_templates WHERE coach_id = ?
		 ORDER BY created_at DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list workout templates: %w", err)
	}
	defer rows.Close()

	var templates []*workout.WorkoutTemplate
	for rows.Next() {
		t := &workout.WorkoutTemplate{}
		var estimatedDuration sql.NullInt64
		if err := rows.Scan(&t.ID, &t.CoachID, &t.Name, &t.Description, &t.Goal,
			&estimatedDuration, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan workout template: %w", err)
		}
		if estimatedDuration.Valid {
			d := int(estimatedDuration.Int64)
			t.EstimatedDurationMinutes = &d
		}
		templates = append(templates, t)
	}
	return templates, nil
}

// Create inserts a new workout template with its exercises.
func (r *Repository) Create(ctx context.Context, t *workout.WorkoutTemplate) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	var estimatedDuration sql.NullInt64
	if t.EstimatedDurationMinutes != nil {
		estimatedDuration = sql.NullInt64{Int64: int64(*t.EstimatedDurationMinutes), Valid: true}
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO workout_templates (id, coach_id, name, description, goal, estimated_duration_minutes)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		t.ID, t.CoachID, t.Name, t.Description, t.Goal, estimatedDuration)
	if err != nil {
		return fmt.Errorf("failed to create workout template: %w", err)
	}

	for _, ex := range t.Exercises {
		if err := r.insertExercise(ctx, tx, &ex); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// Update modifies an existing workout template and replaces its exercises.
func (r *Repository) Update(ctx context.Context, t *workout.WorkoutTemplate) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	var estimatedDuration sql.NullInt64
	if t.EstimatedDurationMinutes != nil {
		estimatedDuration = sql.NullInt64{Int64: int64(*t.EstimatedDurationMinutes), Valid: true}
	}

	result, err := tx.ExecContext(ctx,
		`UPDATE workout_templates SET name = ?, description = ?, goal = ?,
		 estimated_duration_minutes = ?, updated_at = datetime('now')
		 WHERE id = ?`,
		t.Name, t.Description, t.Goal, estimatedDuration, t.ID)
	if err != nil {
		return fmt.Errorf("failed to update workout template: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("WorkoutTemplate", t.ID)
	}

	// Replace exercises: delete old, insert new
	_, err = tx.ExecContext(ctx, `DELETE FROM workout_template_exercises WHERE template_id = ?`, t.ID)
	if err != nil {
		return fmt.Errorf("failed to delete old exercises: %w", err)
	}

	for _, ex := range t.Exercises {
		if err := r.insertExercise(ctx, tx, &ex); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// Delete removes a workout template and all associated exercises.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM workout_templates WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete workout template: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("WorkoutTemplate", id)
	}
	return nil
}

// getExercises retrieves all exercises for a given template ID, ordered by sort_order.
func (r *Repository) getExercises(ctx context.Context, templateID string) ([]workout.Exercise, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, template_id, name, sets, reps, weight_kg, rest_seconds, sort_order,
		 notes, mode, phase, superset_group, reps_min, reps_max, prog, inc, sec,
		 minutes, speed, per_side, body_part, muscle_groups, library_exercise_id
		 FROM workout_template_exercises
		 WHERE template_id = ? ORDER BY sort_order`, templateID)
	if err != nil {
		return nil, fmt.Errorf("failed to get exercises: %w", err)
	}
	defer rows.Close()

	var exercises []workout.Exercise
	for rows.Next() {
		ex := workout.Exercise{}
		var weightKg, increment, speed sql.NullFloat64
		var repsMin, repsMax, durationSec sql.NullInt64
		var durationMinutes sql.NullFloat64
		var notes, supersetGroup, prog, bodyPart, muscleGroups, libraryExerciseID sql.NullString
		var perSide int

		if err := rows.Scan(&ex.ID, &ex.TemplateID, &ex.Name, &ex.Sets, &ex.Reps,
			&weightKg, &ex.RestSeconds, &ex.SortOrder, &notes, &ex.Mode, &ex.Phase,
			&supersetGroup, &repsMin, &repsMax, &prog, &increment, &durationSec,
			&durationMinutes, &speed, &perSide, &bodyPart, &muscleGroups, &libraryExerciseID); err != nil {
			return nil, fmt.Errorf("failed to scan exercise: %w", err)
		}

		ex.PerSide = perSide == 1
		if weightKg.Valid {
			ex.WeightKg = weightKg.Float64
		}
		if increment.Valid {
			ex.Increment = increment.Float64
		}
		if speed.Valid {
			ex.Speed = speed.Float64
		}
		if durationMinutes.Valid {
			ex.DurationMinutes = durationMinutes.Float64
		}
		if repsMin.Valid {
			v := int(repsMin.Int64)
			ex.RepsMin = &v
		}
		if repsMax.Valid {
			v := int(repsMax.Int64)
			ex.RepsMax = &v
		}
		if notes.Valid {
			ex.Notes = notes.String
		}
		if supersetGroup.Valid {
			ex.SupersetGroup = supersetGroup.String
		}
		if prog.Valid {
			ex.Progression = prog.String
		}
		if durationSec.Valid {
			ex.DurationSeconds = int(durationSec.Int64)
		}
		if bodyPart.Valid {
			ex.BodyPart = bodyPart.String
		}
		if muscleGroups.Valid {
			ex.MuscleGroups = muscleGroups.String
		}
		if libraryExerciseID.Valid {
			ex.LibraryExerciseID = libraryExerciseID.String
		}

		exercises = append(exercises, ex)
	}
	return exercises, nil
}

// insertExercise inserts a single exercise into a transaction.
func (r *Repository) insertExercise(ctx context.Context, tx *sql.Tx, ex *workout.Exercise) error {
	var weightKg, increment, speed sql.NullFloat64
	if ex.WeightKg != 0 {
		weightKg = sql.NullFloat64{Float64: ex.WeightKg, Valid: true}
	}
	if ex.Increment != 0 {
		increment = sql.NullFloat64{Float64: ex.Increment, Valid: true}
	}
	if ex.Speed != 0 {
		speed = sql.NullFloat64{Float64: ex.Speed, Valid: true}
	}

	var repsMin, repsMax, durationSec sql.NullInt64
	if ex.RepsMin != nil {
		repsMin = sql.NullInt64{Int64: int64(*ex.RepsMin), Valid: true}
	}
	if ex.RepsMax != nil {
		repsMax = sql.NullInt64{Int64: int64(*ex.RepsMax), Valid: true}
	}
	if ex.DurationSeconds != 0 {
		durationSec = sql.NullInt64{Int64: int64(ex.DurationSeconds), Valid: true}
	}

	var durationMinutes sql.NullFloat64
	if ex.DurationMinutes != 0 {
		durationMinutes = sql.NullFloat64{Float64: ex.DurationMinutes, Valid: true}
	}

	perSide := 0
	if ex.PerSide {
		perSide = 1
	}

	_, err := tx.ExecContext(ctx,
		`INSERT INTO workout_template_exercises
		 (id, template_id, name, sets, reps, weight_kg, rest_seconds, sort_order,
		  notes, mode, phase, superset_group, reps_min, reps_max, prog, inc, sec,
		  minutes, speed, per_side, body_part, muscle_groups, library_exercise_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		ex.ID, ex.TemplateID, ex.Name, ex.Sets, ex.Reps, weightKg, ex.RestSeconds,
		ex.SortOrder, nullStr(ex.Notes), ex.Mode, ex.Phase, nullStr(ex.SupersetGroup),
		repsMin, repsMax, nullStr(ex.Progression), increment, durationSec,
		durationMinutes, speed, perSide, nullStr(ex.BodyPart),
		nullStr(ex.MuscleGroups), nullStr(ex.LibraryExerciseID))
	if err != nil {
		return fmt.Errorf("failed to insert exercise: %w", err)
	}
	return nil
}

// nullStr converts an empty string to sql.NullString with Valid=false.
func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
