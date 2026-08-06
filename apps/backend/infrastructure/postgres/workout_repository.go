package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/internal/training"
)

type WorkoutRepository struct {
	db *pgxpool.Pool
}

func NewWorkoutRepository(db *pgxpool.Pool) *WorkoutRepository {
	return &WorkoutRepository{db: db}
}

func (r *WorkoutRepository) Save(ctx context.Context, w *training.Workout) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO workouts (id, program_id, organization_id, athlete_id, coach_id, name, description, sport_type, scheduled_date, completed_at, status, rpe, athlete_notes, coach_notes, coach_feedback, reviewed_at, reviewed_by, source, source_id, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
		ON CONFLICT (id) DO UPDATE SET
			program_id = EXCLUDED.program_id,
			status = EXCLUDED.status,
			rpe = EXCLUDED.rpe,
			athlete_notes = EXCLUDED.athlete_notes,
			coach_notes = EXCLUDED.coach_notes,
			coach_feedback = EXCLUDED.coach_feedback,
			reviewed_at = EXCLUDED.reviewed_at,
			reviewed_by = EXCLUDED.reviewed_by,
			completed_at = EXCLUDED.completed_at,
			version = EXCLUDED.version,
			updated_at = EXCLUDED.updated_at
	`
	now := time.Now()
	_, err = tx.Exec(ctx, query,
		w.ID(), w.ProgramID(), w.OrganizationID(), w.AthleteID(), w.CoachID(),
		w.Name(), w.Description(), w.SportType(), w.ScheduledDate(), w.CompletedAt(),
		string(w.Status()), w.RPE(), w.AthleteNotes(), w.CoachNotes(), w.CoachFeedback(),
		w.ReviewedAt(), w.ReviewedBy(), w.Source(), w.SourceID(), w.Version(),
		w.CreatedAt(), now,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `DELETE FROM workout_sets WHERE exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = $1)`, w.ID())
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM workout_exercises WHERE workout_id = $1`, w.ID())
	if err != nil {
		return err
	}

	for _, ex := range w.Exercises() {
		_, err = tx.Exec(ctx, `
			INSERT INTO workout_exercises (id, workout_id, exercise_id, section, sort_order, notes, rest_seconds, tempo)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, ex.ID(), w.ID(), ex.ExerciseID(), ex.Section(), ex.SortOrder(), ex.Notes(), ex.RestSeconds(), ex.Tempo())
		if err != nil {
			return err
		}

		for _, set := range ex.Sets() {
			_, err = tx.Exec(ctx, `
				INSERT INTO workout_sets (id, exercise_id, set_number, set_type, prescribed_reps, prescribed_weight, prescribed_rpe, actual_reps, actual_weight, is_completed, is_skipped, completed_at, notes)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			`, set.ID(), ex.ID(), set.SetNumber(), set.SetType(), set.PrescribedReps(), set.PrescribedWeight(), set.PrescribedRPE(), set.ActualReps(), set.ActualWeight(), set.IsCompleted(), set.IsSkipped(), set.CompletedAt(), set.Notes())
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

type workoutRow struct {
	id              uuid.UUID
	programID       *uuid.NullUUID
	organizationID  uuid.UUID
	athleteID       uuid.UUID
	coachID         *uuid.NullUUID
	name            string
	description     string
	sportType       string
	status          string
	completedAt     *time.Time
	reviewedAt      *time.Time
	reviewedBy      *uuid.NullUUID
	rpe             *int
	athleteNotes    string
	coachNotes      string
	coachFeedback   string
	source          string
	sourceID        string
	version         int
	createdAt       time.Time
	scheduledDate   time.Time
}

func (r *WorkoutRepository) FindByID(ctx context.Context, id, orgID uuid.UUID) (*training.Workout, error) {
	var wr workoutRow
	err := r.db.QueryRow(ctx, `
		SELECT id, program_id, organization_id, athlete_id, coach_id, name, description, sport_type, scheduled_date, completed_at, status, rpe, athlete_notes, coach_notes, coach_feedback, reviewed_at, reviewed_by, source, source_id, version, created_at
		FROM workouts
		WHERE id = $1 AND organization_id = $2
	`, id, orgID).Scan(
		&wr.id, &wr.programID, &wr.organizationID, &wr.athleteID, &wr.coachID,
		&wr.name, &wr.description, &wr.sportType, &wr.scheduledDate, &wr.completedAt,
		&wr.status, &wr.rpe, &wr.athleteNotes, &wr.coachNotes, &wr.coachFeedback,
		&wr.reviewedAt, &wr.reviewedBy, &wr.source, &wr.sourceID, &wr.version, &wr.createdAt,
	)
	if err != nil {
		return nil, err
	}

	var progID, coachUUID *uuid.UUID
	if wr.programID != nil && wr.programID.Valid {
		progID = &wr.programID.UUID
	}
	if wr.coachID != nil && wr.coachID.Valid {
		coachUUID = &wr.coachID.UUID
	}

	w := training.ReconstructWorkout(
		wr.id, progID, wr.organizationID, wr.athleteID, coachUUID,
		wr.name, wr.description, wr.sportType, wr.scheduledDate, wr.completedAt,
		training.WorkoutStatus(wr.status), wr.rpe, wr.athleteNotes, wr.coachNotes, wr.coachFeedback,
		wr.reviewedAt, nil, wr.source, wr.sourceID, wr.version, wr.createdAt,
	)

	rows, err := r.db.Query(ctx, `
		SELECT id, exercise_id, section, sort_order, notes, rest_seconds, tempo
		FROM workout_exercises
		WHERE workout_id = $1
		ORDER BY sort_order ASC
	`, id)
	if err != nil {
		return w, nil
	}
	defer rows.Close()

	for rows.Next() {
		var exID, exExerciseID uuid.UUID
		var section string
		var sortOrder, restSeconds int
		var notes, tempo string
		rows.Scan(&exID, &exExerciseID, &section, &sortOrder, &notes, &restSeconds, &tempo)

		w.AddExercise(exExerciseID, section, sortOrder, notes, restSeconds, tempo)

		setRows, err := r.db.Query(ctx, `
			SELECT id, set_number, set_type, prescribed_reps, prescribed_weight, prescribed_rpe, actual_reps, actual_weight, is_completed, is_skipped, completed_at, notes
			FROM workout_sets
			WHERE exercise_id = $1
		`, exID)
		if err != nil {
			continue
		}

		for setRows.Next() {
			var setID uuid.UUID
			var setNumber int
			var setType string
			var presReps *int
			var presWeight *float64
			var presRPE *float64
			var actualReps *int
			var actualWeight *float64
			var isCompleted, isSkipped bool
			var completedAt *time.Time
			var setNotes string
			setRows.Scan(&setID, &setNumber, &setType, &presReps, &presWeight, &presRPE, &actualReps, &actualWeight, &isCompleted, &isSkipped, &completedAt, &setNotes)

			w.AddReconstructedSet(len(w.Exercises())-1, setID, setNumber, setType, presReps, presWeight, presRPE, actualReps, actualWeight, isCompleted, isSkipped, completedAt, setNotes)
		}
		setRows.Close()
	}

	return w, nil
}

func (r *WorkoutRepository) FindByAthlete(ctx context.Context, athleteID uuid.UUID, dateRange training.DateRangeFilter) ([]*training.Workout, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, organization_id, name, description, sport_type, scheduled_date, status, version, created_at
		FROM workouts
		WHERE athlete_id = $1 AND organization_id = $2 AND scheduled_date BETWEEN $3 AND $4
		ORDER BY scheduled_date DESC
		LIMIT 100
	`, athleteID, dateRange.Start, dateRange.End)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workouts []*training.Workout
	for rows.Next() {
		var id, orgID uuid.UUID
		var name, desc, sport, status string
		var scheduledDate time.Time
		var version int
		var createdAt time.Time
		rows.Scan(&id, &orgID, &name, &desc, &sport, &scheduledDate, &status, &version, &createdAt)

		w := training.ReconstructWorkout(
			id, nil, orgID, athleteID, nil,
			name, desc, sport, scheduledDate, nil,
			training.WorkoutStatus(status), nil, "", "", "",
			nil, nil, "manual", "", version, createdAt,
		)
		workouts = append(workouts, w)
	}

	return workouts, rows.Err()
}

func (r *WorkoutRepository) FindScheduledForDate(ctx context.Context, athleteID uuid.UUID, date time.Time) ([]*training.Workout, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, organization_id, name, description, sport_type, scheduled_date, status, version, created_at
		FROM workouts
		WHERE athlete_id = $1 AND DATE(scheduled_date) = DATE($2)
		ORDER BY scheduled_date ASC
	`, athleteID, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workouts []*training.Workout
	for rows.Next() {
		var id, orgID uuid.UUID
		var name, desc, sport, status string
		var scheduledDate time.Time
		var version int
		var createdAt time.Time
		rows.Scan(&id, &orgID, &name, &desc, &sport, &scheduledDate, &status, &version, &createdAt)

		w := training.ReconstructWorkout(
			id, nil, orgID, athleteID, nil,
			name, desc, sport, scheduledDate, nil,
			training.WorkoutStatus(status), nil, "", "", "",
			nil, nil, "manual", "", version, createdAt,
		)
		workouts = append(workouts, w)
	}

	return workouts, rows.Err()
}

func (r *WorkoutRepository) FindByProgram(ctx context.Context, programID uuid.UUID) ([]*training.Workout, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, organization_id, athlete_id, name, description, sport_type, scheduled_date, status, version, created_at
		FROM workouts
		WHERE program_id = $1
		ORDER BY scheduled_date ASC
	`, programID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workouts []*training.Workout
	for rows.Next() {
		var id, orgID, aID uuid.UUID
		var name, desc, sport, status string
		var scheduledDate time.Time
		var version int
		var createdAt time.Time
		rows.Scan(&id, &orgID, &aID, &name, &desc, &sport, &scheduledDate, &status, &version, &createdAt)

		w := training.ReconstructWorkout(
			id, &programID, orgID, aID, nil,
			name, desc, sport, scheduledDate, nil,
			training.WorkoutStatus(status), nil, "", "", "",
			nil, nil, "program", "", version, createdAt,
		)
		workouts = append(workouts, w)
	}

	return workouts, rows.Err()
}

func (r *WorkoutRepository) FindPendingReview(ctx context.Context, coachID, orgID uuid.UUID) ([]*training.Workout, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, organization_id, athlete_id, name, description, sport_type, scheduled_date, status, completed_at, version, created_at
		FROM workouts
		WHERE coach_id = $1 AND organization_id = $2 AND status = 'completed'
		ORDER BY completed_at DESC
		LIMIT 100
	`, coachID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workouts []*training.Workout
	for rows.Next() {
		var id, orgID, aID uuid.UUID
		var name, desc, sport, status string
		var scheduledDate time.Time
		var completedAt time.Time
		var version int
		var createdAt time.Time
		rows.Scan(&id, &orgID, &aID, &name, &desc, &sport, &scheduledDate, &status, &completedAt, &version, &createdAt)

		w := training.ReconstructWorkout(
			id, nil, orgID, aID, &coachID,
			name, desc, sport, scheduledDate, &completedAt,
			training.WorkoutStatus(status), nil, "", "", "",
			nil, nil, "manual", "", version, createdAt,
		)
		workouts = append(workouts, w)
	}

	return workouts, rows.Err()
}
