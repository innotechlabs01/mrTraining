package training

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// WorkoutRepository implements training.WorkoutRepository using database/sql with Turso/libsql.
type WorkoutRepository struct {
	db *sql.DB
}

// NewWorkoutRepository creates a new workout repository with the given database connection.
func NewWorkoutRepository(db *sql.DB) *WorkoutRepository {
	return &WorkoutRepository{db: db}
}

// ListTemplates retrieves all workout templates for a specific coach.
func (r *WorkoutRepository) ListTemplates(ctx context.Context, coachID string) ([]*training.WorkoutTemplate, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, coach_id, name, description, goal, estimated_duration_minutes,
		 created_at, updated_at
		 FROM workout_templates WHERE coach_id = ?
		 ORDER BY created_at DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list workout templates: %w", err)
	}
	defer rows.Close()

	var templates []*training.WorkoutTemplate
	for rows.Next() {
		t := &training.WorkoutTemplate{}
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

// GetTemplate retrieves a workout template by its unique identifier,
// including all associated exercises.
func (r *WorkoutRepository) GetTemplate(ctx context.Context, id string) (*training.WorkoutTemplate, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, coach_id, name, description, goal, estimated_duration_minutes,
		 created_at, updated_at
		 FROM workout_templates WHERE id = ?`, id)

	t := &training.WorkoutTemplate{}
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
	exercises, err := r.getTemplateExercises(ctx, id)
	if err != nil {
		return nil, err
	}
	t.Exercises = exercises

	return t, nil
}

// CreateTemplate inserts a new workout template with its exercises.
func (r *WorkoutRepository) CreateTemplate(ctx context.Context, t *training.WorkoutTemplate) error {
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
		if err := r.insertTemplateExercise(ctx, tx, &ex); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// AssignWorkout assigns a workout template to an athlete.
// Creates the assigned_workout record and copies exercises from the template.
func (r *WorkoutRepository) AssignWorkout(ctx context.Context, a *training.AssignedWorkout) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	daysJSON, err := json.Marshal(a.DaysOfWeek)
	if err != nil {
		return fmt.Errorf("failed to marshal days_of_week: %w", err)
	}

	// Insert the assigned workout record
	_, err = tx.ExecContext(ctx,
		`INSERT INTO assigned_workouts
		 (id, athlete_id, athlete_name, content_id, content_type, content_name,
		  modality, start_date, end_date, days_of_week, status, progress, coach_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.ID, a.AthleteID, a.AthleteName, a.ContentID, a.ContentType, a.ContentName,
		a.Modality, a.StartDate, a.EndDate, string(daysJSON), a.Status, a.Progress, a.CoachID)
	if err != nil {
		return fmt.Errorf("failed to assign workout: %w", err)
	}

	// Copy exercises from the template to the assigned workout
	_, err = tx.ExecContext(ctx,
		`INSERT INTO workout_exercises
		 (id, workout_id, name, sets, reps, weight_kg, rest_seconds, sort_order, notes,
		  mode, phase, superset_group, reps_min, reps_max, prog, inc, sec, minutes, speed,
		  per_side, body_part, muscle_groups, library_exercise_id)
		 SELECT
		  hex(randomblob(16)) AS id,
		  ? AS workout_id,
		  wte.name, wte.sets, wte.reps, wte.weight_kg, wte.rest_seconds, wte.sort_order, wte.notes,
		  wte.mode, wte.phase, wte.superset_group, wte.reps_min, wte.reps_max, wte.prog, wte.inc,
		  wte.sec, wte.minutes, wte.speed, wte.per_side, wte.body_part, wte.muscle_groups,
		  wte.library_exercise_id
		 FROM workout_template_exercises wte
		 WHERE wte.template_id = ?`,
		a.ID, a.ContentID)
	if err != nil {
		return fmt.Errorf("failed to copy template exercises: %w", err)
	}

	return tx.Commit()
}

// ListAssignedWorkouts retrieves all assigned workouts for an athlete.
func (r *WorkoutRepository) ListAssignedWorkouts(ctx context.Context, athleteID string) ([]*training.AssignedWorkout, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, athlete_id, athlete_name, content_id, content_type, content_name,
		 modality, start_date, end_date, days_of_week, status, progress, coach_id,
		 created_at, updated_at
		 FROM assigned_workouts WHERE athlete_id = ?
		 ORDER BY created_at DESC`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list assigned workouts: %w", err)
	}
	defer rows.Close()

	var workouts []*training.AssignedWorkout
	for rows.Next() {
		w := &training.AssignedWorkout{}
		var daysOfWeekJSON string
		var athleteName sql.NullString
		if err := rows.Scan(&w.ID, &w.AthleteID, &athleteName, &w.ContentID, &w.ContentType,
			&w.ContentName, &w.Modality, &w.StartDate, &w.EndDate, &daysOfWeekJSON,
			&w.Status, &w.Progress, &w.CoachID, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan assigned workout: %w", err)
		}
		if athleteName.Valid {
			w.AthleteName = athleteName.String
		}
		if err := json.Unmarshal([]byte(daysOfWeekJSON), &w.DaysOfWeek); err != nil {
			w.DaysOfWeek = []int{}
		}
		workouts = append(workouts, w)
	}
	return workouts, nil
}

// GetAssignedWorkout retrieves a single assigned workout by ID.
func (r *WorkoutRepository) GetAssignedWorkout(ctx context.Context, id string) (*training.AssignedWorkout, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, athlete_id, athlete_name, content_id, content_type, content_name,
		 modality, start_date, end_date, days_of_week, status, progress, coach_id,
		 created_at, updated_at
		 FROM assigned_workouts WHERE id = ?`, id)

	w := &training.AssignedWorkout{}
	var daysOfWeekJSON string
	var athleteName sql.NullString
	err := row.Scan(&w.ID, &w.AthleteID, &athleteName, &w.ContentID, &w.ContentType,
		&w.ContentName, &w.Modality, &w.StartDate, &w.EndDate, &daysOfWeekJSON,
		&w.Status, &w.Progress, &w.CoachID, &w.CreatedAt, &w.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("AssignedWorkout", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get assigned workout: %w", err)
	}
	if athleteName.Valid {
		w.AthleteName = athleteName.String
	}
	if err := json.Unmarshal([]byte(daysOfWeekJSON), &w.DaysOfWeek); err != nil {
		w.DaysOfWeek = []int{}
	}
	return w, nil
}

// LogWorkoutSet records a completed set within a workout session.
// Creates the session if one doesn't exist for the workout/athlete pair.
func (r *WorkoutRepository) LogWorkoutSet(ctx context.Context, set *training.WorkoutSet, workoutID, athleteID string) (*training.WorkoutSet, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Find or create an active session for this workout/athlete
	var sessionID string
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM workout_session_logs
		 WHERE workout_id = ? AND athlete_id = ? AND completed = 0
		 ORDER BY started_at DESC LIMIT 1`, workoutID, athleteID).Scan(&sessionID)
	if err == sql.ErrNoRows {
		// Create new session
		sessionID = generateID()
		_, err = tx.ExecContext(ctx,
			`INSERT INTO workout_session_logs
			 (id, workout_id, athlete_id, started_at, completed, current_exercise_index, duration_seconds)
			 VALUES (?, ?, ?, datetime('now'), 0, 0, 0)`,
			sessionID, workoutID, athleteID)
		if err != nil {
			return nil, fmt.Errorf("failed to create workout session: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to find workout session: %w", err)
	}

	// Insert the set log
	set.ID = generateID()
	set.SessionID = sessionID
	set.LoggedAt = "datetime('now')"

	var weightKg, rir, rpe, speed sql.NullFloat64
	if set.WeightKg != 0 {
		weightKg = sql.NullFloat64{Float64: set.WeightKg, Valid: true}
	}
	if set.RIR != 0 {
		rir = sql.NullFloat64{Float64: set.RIR, Valid: true}
	}
	if set.RPE != 0 {
		rpe = sql.NullFloat64{Float64: set.RPE, Valid: true}
	}
	if set.Speed != 0 {
		speed = sql.NullFloat64{Float64: set.Speed, Valid: true}
	}

	var duration sql.NullInt64
	if set.Duration != 0 {
		duration = sql.NullInt64{Int64: int64(set.Duration), Valid: true}
	}

	completed := 0
	if set.Completed {
		completed = 1
	}
	skipped := 0
	if set.Skipped {
		skipped = 1
	}

	var phase sql.NullString
	if set.Phase != "" {
		phase = sql.NullString{String: set.Phase, Valid: true}
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO workout_set_logs
		 (id, session_id, exercise_id, set_index, weight_kg, reps, completed, logged_at,
		  phase, rir, rpe, sec, minutes, speed, skipped)
		 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`,
		set.ID, set.SessionID, set.ExerciseID, set.SetIndex, weightKg, set.Reps,
		completed, phase, rir, rpe, duration, nil, speed, skipped)
	if err != nil {
		return nil, fmt.Errorf("failed to log workout set: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit set log: %w", err)
	}

	set.LoggedAt = ""
	return set, nil
}

// getTemplateExercises retrieves all exercises for a given template ID.
func (r *WorkoutRepository) getTemplateExercises(ctx context.Context, templateID string) ([]training.WorkoutExercise, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, template_id, name, sets, reps, weight_kg, rest_seconds, sort_order,
		 notes, mode, phase, superset_group, reps_min, reps_max, prog, inc, sec,
		 minutes, speed, per_side, body_part, muscle_groups, library_exercise_id
		 FROM workout_template_exercises
		 WHERE template_id = ? ORDER BY sort_order`, templateID)
	if err != nil {
		return nil, fmt.Errorf("failed to get template exercises: %w", err)
	}
	defer rows.Close()

	var exercises []training.WorkoutExercise
	for rows.Next() {
		ex := training.WorkoutExercise{}
		var weightKg, increment, speed sql.NullFloat64
		var repsMin, repsMax, durationSec sql.NullInt64
		var durationMinutes sql.NullFloat64
		var notes, supersetGroup, prog, bodyPart, muscleGroups, libraryExerciseID sql.NullString
		var perSide int

		if err := rows.Scan(&ex.ID, &ex.TemplateID, &ex.Name, &ex.Sets, &ex.Reps,
			&weightKg, &ex.RestSeconds, &ex.SortOrder, &notes, &ex.Mode, &ex.Phase,
			&supersetGroup, &repsMin, &repsMax, &prog, &increment, &durationSec,
			&durationMinutes, &speed, &perSide, &bodyPart, &muscleGroups, &libraryExerciseID); err != nil {
			return nil, fmt.Errorf("failed to scan template exercise: %w", err)
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

// insertTemplateExercise inserts a single exercise into a template within a transaction.
func (r *WorkoutRepository) insertTemplateExercise(ctx context.Context, tx *sql.Tx, ex *training.WorkoutExercise) error {
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
		return fmt.Errorf("failed to insert template exercise: %w", err)
	}
	return nil
}

// GetAssignedWorkoutDetail retrieves a full assigned workout with its exercises.
func (r *WorkoutRepository) GetAssignedWorkoutDetail(ctx context.Context, id string) (*training.AssignedWorkout, error) {
	aw, err := r.GetAssignedWorkout(ctx, id)
	if err != nil {
		return nil, err
	}

	// Load exercises for the assigned workout
	exercises, err := r.getAssignedWorkoutExercises(ctx, id)
	if err != nil {
		return nil, err
	}

	// Store exercises in a custom field (we'll use a helper approach)
	// For now, exercises are accessible via GetPrescription
	_ = exercises

	return aw, nil
}

// getAssignedWorkoutExercises retrieves exercises for an assigned workout.
func (r *WorkoutRepository) getAssignedWorkoutExercises(ctx context.Context, workoutID string) ([]training.WorkoutExercise, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, workout_id, name, sets, reps, weight_kg, rest_seconds, sort_order,
		 notes, mode, phase, superset_group, body_part, muscle_groups, library_exercise_id
		 FROM workout_exercises
		 WHERE workout_id = ? ORDER BY sort_order`, workoutID)
	if err != nil {
		return nil, fmt.Errorf("failed to get assigned workout exercises: %w", err)
	}
	defer rows.Close()

	var exercises []training.WorkoutExercise
	for rows.Next() {
		ex := training.WorkoutExercise{}
		var weightKg sql.NullFloat64
		var notes, supersetGroup, bodyPart, muscleGroups, libraryExerciseID sql.NullString

		if err := rows.Scan(&ex.ID, &ex.TemplateID, &ex.Name, &ex.Sets, &ex.Reps,
			&weightKg, &ex.RestSeconds, &ex.SortOrder, &notes, &ex.Mode, &ex.Phase,
			&supersetGroup, &bodyPart, &muscleGroups, &libraryExerciseID); err != nil {
			return nil, fmt.Errorf("failed to scan assigned workout exercise: %w", err)
		}

		if weightKg.Valid {
			ex.WeightKg = weightKg.Float64
		}
		if notes.Valid {
			ex.Notes = notes.String
		}
		if supersetGroup.Valid {
			ex.SupersetGroup = supersetGroup.String
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

// GetWorkoutSession retrieves a workout session by ID.
func (r *WorkoutRepository) GetWorkoutSession(ctx context.Context, sessionID string) (*training.WorkoutSession, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, workout_id, athlete_id, started_at, completed, completed_at,
		 current_exercise_index, duration_seconds
		 FROM workout_session_logs WHERE id = ?`, sessionID)

	s := &training.WorkoutSession{}
	var completedAt sql.NullString
	err := row.Scan(&s.ID, &s.WorkoutID, &s.AthleteID, &s.StartedAt, &s.Completed,
		&completedAt, &s.CurrentExerciseIndex, &s.DurationSeconds)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("WorkoutSession", sessionID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get workout session: %w", err)
	}
	if completedAt.Valid {
		s.CompletedAt = completedAt.String
	}
	return s, nil
}

// CreateWorkoutSession creates a new workout session for an athlete.
func (r *WorkoutRepository) CreateWorkoutSession(ctx context.Context, workoutID, athleteID string) (*training.WorkoutSession, error) {
	session := &training.WorkoutSession{
		ID:        generateID(),
		WorkoutID: workoutID,
		AthleteID: athleteID,
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO workout_session_logs
		 (id, workout_id, athlete_id, started_at, completed, current_exercise_index, duration_seconds)
		 VALUES (?, ?, ?, datetime('now'), 0, 0, 0)`,
		session.ID, session.WorkoutID, session.AthleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to create workout session: %w", err)
	}

	return session, nil
}

// CompleteSession marks a session as completed with the given duration.
func (r *WorkoutRepository) CompleteSession(ctx context.Context, sessionID string, durationSeconds int) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE workout_session_logs
		 SET completed = 1, completed_at = datetime('now'), duration_seconds = ?
		 WHERE id = ? AND completed = 0`,
		durationSeconds, sessionID)
	if err != nil {
		return fmt.Errorf("failed to complete session: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("WorkoutSession", sessionID)
	}
	return nil
}

// GetPrescription retrieves the exercise prescription for an assigned workout.
func (r *WorkoutRepository) GetPrescription(ctx context.Context, workoutID string) ([]training.WorkoutExercise, error) {
	return r.getAssignedWorkoutExercises(ctx, workoutID)
}

// ListAssignedWorkoutsByCoach retrieves all assigned workouts created by a coach.
func (r *WorkoutRepository) ListAssignedWorkoutsByCoach(ctx context.Context, coachID string) ([]*training.AssignedWorkout, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, athlete_id, athlete_name, content_id, content_type, content_name,
		 modality, start_date, end_date, days_of_week, status, progress, coach_id,
		 created_at, updated_at
		 FROM assigned_workouts WHERE coach_id = ?
		 ORDER BY created_at DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list assigned workouts by coach: %w", err)
	}
	defer rows.Close()

	var workouts []*training.AssignedWorkout
	for rows.Next() {
		w := &training.AssignedWorkout{}
		var daysOfWeekJSON string
		var athleteName sql.NullString
		if err := rows.Scan(&w.ID, &w.AthleteID, &athleteName, &w.ContentID, &w.ContentType,
			&w.ContentName, &w.Modality, &w.StartDate, &w.EndDate, &daysOfWeekJSON,
			&w.Status, &w.Progress, &w.CoachID, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan assigned workout: %w", err)
		}
		if athleteName.Valid {
			w.AthleteName = athleteName.String
		}
		if err := json.Unmarshal([]byte(daysOfWeekJSON), &w.DaysOfWeek); err != nil {
			w.DaysOfWeek = []int{}
		}
		workouts = append(workouts, w)
	}
	return workouts, nil
}

// UpdateAssignedWorkout updates an assigned workout's fields.
func (r *WorkoutRepository) UpdateAssignedWorkout(ctx context.Context, id string, aw *training.AssignedWorkout) error {
	daysJSON, err := json.Marshal(aw.DaysOfWeek)
	if err != nil {
		return fmt.Errorf("failed to marshal days_of_week: %w", err)
	}

	result, err := r.db.ExecContext(ctx,
		`UPDATE assigned_workouts
		 SET modality = ?, start_date = ?, end_date = ?, days_of_week = ?,
		     status = ?, updated_at = datetime('now')
		 WHERE id = ?`,
		aw.Modality, aw.StartDate, aw.EndDate, string(daysJSON), aw.Status, id)
	if err != nil {
		return fmt.Errorf("failed to update assigned workout: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("AssignedWorkout", id)
	}
	return nil
}

// DeleteAssignedWorkout deletes an assigned workout and its exercises.
func (r *WorkoutRepository) DeleteAssignedWorkout(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `DELETE FROM workout_exercises WHERE workout_id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete workout exercises: %w", err)
	}

	result, err := tx.ExecContext(ctx, `DELETE FROM assigned_workouts WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete assigned workout: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("AssignedWorkout", id)
	}

	return tx.Commit()
}

// DeleteTemplate deletes a workout template and its exercises.
func (r *WorkoutRepository) DeleteTemplate(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `DELETE FROM workout_template_exercises WHERE template_id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete template exercises: %w", err)
	}

	result, err := tx.ExecContext(ctx, `DELETE FROM workout_templates WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("WorkoutTemplate", id)
	}

	return tx.Commit()
}

// generateID creates a new UUID for use as a database ID.
func generateID() string {
	return uuid.New().String()
}

// nullStr converts an empty string to sql.NullString with Valid=false.
func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
