package exercise

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/exercise"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements exercise.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new exercise repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetByID retrieves an exercise entry by its unique identifier.
func (r *Repository) GetByID(ctx context.Context, id string) (*exercise.ExerciseEntry, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE id = ?`, id)

	e := &exercise.ExerciseEntry{}
	var bodyPart, equipment, difficulty, category, videoURL, coachID sql.NullString
	var defaultSec sql.NullInt64
	err := row.Scan(&e.ID, &e.Slug, &e.Name, &e.Description, &e.Mode, &bodyPart,
		&e.MuscleGroups, &e.SecondaryMuscles, &equipment, &difficulty, &category,
		&e.Instructions, &defaultSec, &videoURL, &e.IsCustom, &coachID,
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
	row := r.db.QueryRowContext(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE slug = ?`, slug)

	e := &exercise.ExerciseEntry{}
	var bodyPart, equipment, difficulty, category, videoURL, coachID sql.NullString
	var defaultSec sql.NullInt64
	err := row.Scan(&e.ID, &e.Slug, &e.Name, &e.Description, &e.Mode, &bodyPart,
		&e.MuscleGroups, &e.SecondaryMuscles, &equipment, &difficulty, &category,
		&e.Instructions, &defaultSec, &videoURL, &e.IsCustom, &coachID,
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
		 default_sec, video_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE is_custom = 0
		 ORDER BY name`)
}

// ListByCoach retrieves global exercises plus custom exercises for a specific coach.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*exercise.ExerciseEntry, error) {
	return r.listExercises(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE is_custom = 0 OR coach_id = ?
		 ORDER BY name`, coachID)
}

// Create inserts a new custom exercise entry for a coach.
func (r *Repository) Create(ctx context.Context, e *exercise.ExerciseEntry) error {
	var bodyPart, equipment, difficulty, category, videoURL, coachID sql.NullString
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
	if e.CoachID != nil {
		coachID = sql.NullString{String: *e.CoachID, Valid: true}
	}

	var defaultSec sql.NullInt64
	if e.DefaultSec != nil {
		defaultSec = sql.NullInt64{Int64: int64(*e.DefaultSec), Valid: true}
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO exercise_library
		 (id, slug, name, description, mode, body_part, muscle_groups, secondary_muscles,
		  equipment, difficulty, category, instructions, default_sec, video_url,
		  is_custom, coach_id, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
		e.ID, e.Slug, e.Name, e.Description, e.Mode, bodyPart, e.MuscleGroups,
		e.SecondaryMuscles, equipment, difficulty, category, e.Instructions,
		defaultSec, videoURL, e.IsCustom, coachID)
	if err != nil {
		return fmt.Errorf("failed to create exercise: %w", err)
	}
	return nil
}

// Update modifies an existing exercise entry.
func (r *Repository) Update(ctx context.Context, e *exercise.ExerciseEntry) error {
	var bodyPart, equipment, difficulty, category, videoURL sql.NullString
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

	var defaultSec sql.NullInt64
	if e.DefaultSec != nil {
		defaultSec = sql.NullInt64{Int64: int64(*e.DefaultSec), Valid: true}
	}

	result, err := r.db.ExecContext(ctx,
		`UPDATE exercise_library SET name = ?, description = ?, mode = ?, body_part = ?,
		 muscle_groups = ?, secondary_muscles = ?, equipment = ?, difficulty = ?,
		 category = ?, instructions = ?, default_sec = ?, video_url = ?,
		 updated_at = datetime('now') WHERE id = ?`,
		e.Name, e.Description, e.Mode, bodyPart, e.MuscleGroups, e.SecondaryMuscles,
		equipment, difficulty, category, e.Instructions, defaultSec, videoURL, e.ID)
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
	result, err := r.db.ExecContext(ctx, `DELETE FROM exercise_library WHERE id = ?`, id)
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
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list exercises: %w", err)
	}
	defer rows.Close()

	var exercises []*exercise.ExerciseEntry
	for rows.Next() {
		e := &exercise.ExerciseEntry{}
		var bodyPart, equipment, difficulty, category, videoURL, coachID sql.NullString
		var defaultSec sql.NullInt64
		if err := rows.Scan(&e.ID, &e.Slug, &e.Name, &e.Description, &e.Mode, &bodyPart,
			&e.MuscleGroups, &e.SecondaryMuscles, &equipment, &difficulty, &category,
			&e.Instructions, &defaultSec, &videoURL, &e.IsCustom, &coachID,
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
