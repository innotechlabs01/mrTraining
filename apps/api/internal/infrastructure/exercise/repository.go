package exercise

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/exercise"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements exercise.Repository using database/sql with Turso/libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new exercise repository with the given database connection.
// By default, all queries run against the connection pool. Use SetExecutor to
// inject a *sql.Tx for transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) exercise.Repository {
	return &Repository{
		db:  r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// GetByID retrieves an exercise entry by its unique identifier.
func (r *Repository) GetByID(ctx context.Context, id string) (*exercise.ExerciseEntry, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, image_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE id = $1`, id)

	e := &exercise.ExerciseEntry{}
	var bodyPart, equipment, difficulty, category, videoURL, imageURL, coachID sql.NullString
	var defaultSec sql.NullInt64
	err := row.Scan(&e.ID, &e.Slug, &e.Name, &e.Description, &e.Mode, &bodyPart,
		&e.MuscleGroups, &e.SecondaryMuscles, &equipment, &difficulty, &category,
		&e.Instructions, &defaultSec, &videoURL, &imageURL, &e.IsCustom, &coachID,
		&e.CreatedAt, &e.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Exercise", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get exercise: %w", err)
	}
	if bodyPart.Valid {
		e.BodyPart = bodyPart.String
	}
	if equipment.Valid {
		e.Equipment = equipment.String
	}
	if difficulty.Valid {
		e.Difficulty = difficulty.String
	}
	if category.Valid {
		e.Category = category.String
	}
	if videoURL.Valid {
		e.VideoURL = videoURL.String
	}
	if imageURL.Valid {
		e.ImageURL = imageURL.String
	}
	if coachID.Valid {
		e.CoachID = &coachID.String
	}
	if defaultSec.Valid {
		v := int(defaultSec.Int64)
		e.DefaultSec = &v
	}
	return e, nil
}

// GetBySlug retrieves an exercise entry by its URL-friendly slug.
func (r *Repository) GetBySlug(ctx context.Context, slug string) (*exercise.ExerciseEntry, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, image_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE slug = $1`, slug)

	e := &exercise.ExerciseEntry{}
	var bodyPart, equipment, difficulty, category, videoURL, imageURL, coachID sql.NullString
	var defaultSec sql.NullInt64
	err := row.Scan(&e.ID, &e.Slug, &e.Name, &e.Description, &e.Mode, &bodyPart,
		&e.MuscleGroups, &e.SecondaryMuscles, &equipment, &difficulty, &category,
		&e.Instructions, &defaultSec, &videoURL, &imageURL, &e.IsCustom, &coachID,
		&e.CreatedAt, &e.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Exercise", slug)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get exercise by slug: %w", err)
	}
	if bodyPart.Valid {
		e.BodyPart = bodyPart.String
	}
	if equipment.Valid {
		e.Equipment = equipment.String
	}
	if difficulty.Valid {
		e.Difficulty = difficulty.String
	}
	if category.Valid {
		e.Category = category.String
	}
	if videoURL.Valid {
		e.VideoURL = videoURL.String
	}
	if imageURL.Valid {
		e.ImageURL = imageURL.String
	}
	if coachID.Valid {
		e.CoachID = &coachID.String
	}
	if defaultSec.Valid {
		v := int(defaultSec.Int64)
		e.DefaultSec = &v
	}
	return e, nil
}

// ListGlobal retrieves all global (non-custom) exercises visible to every coach.
func (r *Repository) ListGlobal(ctx context.Context) ([]*exercise.ExerciseEntry, error) {
	return r.listExercises(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, image_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE is_custom = 0
		 ORDER BY name`)
}

// ListByCoach retrieves global exercises plus custom exercises for a specific coach.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*exercise.ExerciseEntry, error) {
	return r.listExercises(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, image_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE is_custom = 0 OR coach_id = $1
		 ORDER BY name`, coachID)
}

// Create inserts a new custom exercise entry for a coach.
func (r *Repository) Create(ctx context.Context, e *exercise.ExerciseEntry) error {
	var bodyPart, equipment, difficulty, category, videoURL, imageURL, coachID sql.NullString
	if e.BodyPart != "" {
		bodyPart = sql.NullString{String: e.BodyPart, Valid: true}
	}
	if e.Equipment != "" {
		equipment = sql.NullString{String: e.Equipment, Valid: true}
	}
	if e.Difficulty != "" {
		difficulty = sql.NullString{String: e.Difficulty, Valid: true}
	}
	if e.Category != "" {
		category = sql.NullString{String: e.Category, Valid: true}
	}
	if e.VideoURL != "" {
		videoURL = sql.NullString{String: e.VideoURL, Valid: true}
	}
	if e.ImageURL != "" {
		imageURL = sql.NullString{String: e.ImageURL, Valid: true}
	}
	if e.CoachID != nil {
		coachID = sql.NullString{String: *e.CoachID, Valid: true}
	}

	var defaultSec sql.NullInt64
	if e.DefaultSec != nil {
		defaultSec = sql.NullInt64{Int64: int64(*e.DefaultSec), Valid: true}
	}

	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO exercise_library
		 (id, slug, name, description, mode, body_part, muscle_groups, secondary_muscles,
		  equipment, difficulty, category, instructions, default_sec, video_url, image_url,
		  is_custom, coach_id, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
		e.ID, e.Slug, e.Name, e.Description, e.Mode, bodyPart, e.MuscleGroups,
		e.SecondaryMuscles, equipment, difficulty, category, e.Instructions,
		defaultSec, videoURL, imageURL, e.IsCustom, coachID)
	if err != nil {
		return fmt.Errorf("failed to create exercise: %w", err)
	}
	return nil
}

// Update modifies an existing exercise entry.
func (r *Repository) Update(ctx context.Context, e *exercise.ExerciseEntry) error {
	var bodyPart, equipment, difficulty, category, videoURL, imageURL sql.NullString
	if e.BodyPart != "" {
		bodyPart = sql.NullString{String: e.BodyPart, Valid: true}
	}
	if e.Equipment != "" {
		equipment = sql.NullString{String: e.Equipment, Valid: true}
	}
	if e.Difficulty != "" {
		difficulty = sql.NullString{String: e.Difficulty, Valid: true}
	}
	if e.Category != "" {
		category = sql.NullString{String: e.Category, Valid: true}
	}
	if e.VideoURL != "" {
		videoURL = sql.NullString{String: e.VideoURL, Valid: true}
	}
	if e.ImageURL != "" {
		imageURL = sql.NullString{String: e.ImageURL, Valid: true}
	}

	var defaultSec sql.NullInt64
	if e.DefaultSec != nil {
		defaultSec = sql.NullInt64{Int64: int64(*e.DefaultSec), Valid: true}
	}

	result, err := r.exec.ExecContext(ctx,
		`UPDATE exercise_library SET name = $1, description = $2, mode = $3, body_part = $4,
		 muscle_groups = $5, secondary_muscles = $6, equipment = $7, difficulty = $8,
		 category = $9, instructions = $10, default_sec = $11, video_url = $12,
		 image_url = $13, updated_at = NOW() WHERE id = $14`,
		e.Name, e.Description, e.Mode, bodyPart, e.MuscleGroups, e.SecondaryMuscles,
		equipment, difficulty, category, e.Instructions, defaultSec, videoURL, imageURL, e.ID)
	if err != nil {
		return fmt.Errorf("failed to update exercise: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Exercise", e.ID)
	}
	return nil
}

// Delete removes an exercise entry.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.exec.ExecContext(ctx, `DELETE FROM exercise_library WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete exercise: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Exercise", id)
	}
	return nil
}

// listExercises is a helper that executes a query and scans results into ExerciseEntry slices.
func (r *Repository) listExercises(ctx context.Context, query string, args ...interface{}) ([]*exercise.ExerciseEntry, error) {
	rows, err := r.exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list exercises: %w", err)
	}
	defer rows.Close()

	var exercises []*exercise.ExerciseEntry
	for rows.Next() {
		e := &exercise.ExerciseEntry{}
		var bodyPart, equipment, difficulty, category, videoURL, imageURL, coachID sql.NullString
		var defaultSec sql.NullInt64
		if err := rows.Scan(&e.ID, &e.Slug, &e.Name, &e.Description, &e.Mode, &bodyPart,
			&e.MuscleGroups, &e.SecondaryMuscles, &equipment, &difficulty, &category,
			&e.Instructions, &defaultSec, &videoURL, &imageURL, &e.IsCustom, &coachID,
			&e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan exercise: %w", err)
		}
		if bodyPart.Valid {
			e.BodyPart = bodyPart.String
		}
		if equipment.Valid {
			e.Equipment = equipment.String
		}
		if difficulty.Valid {
			e.Difficulty = difficulty.String
		}
		if category.Valid {
			e.Category = category.String
		}
		if videoURL.Valid {
			e.VideoURL = videoURL.String
		}
		if imageURL.Valid {
			e.ImageURL = imageURL.String
		}
		if coachID.Valid {
			e.CoachID = &coachID.String
		}
		if defaultSec.Valid {
			v := int(defaultSec.Int64)
			e.DefaultSec = &v
		}
		exercises = append(exercises, e)
	}
	return exercises, nil
}
