package training

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// ExerciseRepository implements training.ExerciseRepository using database/sql with Turso/libsql.
type ExerciseRepository struct {
	db *sql.DB
}

// NewExerciseRepository creates a new exercise repository with the given database connection.
func NewExerciseRepository(db *sql.DB) *ExerciseRepository {
	return &ExerciseRepository{db: db}
}

// List retrieves exercises with optional filters and pagination.
func (r *ExerciseRepository) List(ctx context.Context, filter training.ExerciseFilter, offset, limit int) ([]*training.ExerciseEntry, int, error) {
	where, args := r.buildWhereClause(filter)

	// Count total matching rows
	countQuery := "SELECT COUNT(*) FROM exercise_library" + where
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count exercises: %w", err)
	}

	// Fetch paginated results
	query := `SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library` + where + ` ORDER BY name LIMIT ? OFFSET ?`

	args = append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list exercises: %w", err)
	}
	defer rows.Close()

	var exercises []*training.ExerciseEntry
	for rows.Next() {
		e := &training.ExerciseEntry{}
		var bodyPart, equipment, difficulty, category, videoURL, coachID sql.NullString
		var defaultSec sql.NullInt64
		if err := rows.Scan(&e.ID, &e.Slug, &e.Name, &e.Description, &e.Mode, &bodyPart,
			&e.MuscleGroups, &e.SecondaryMuscles, &equipment, &difficulty, &category,
			&e.Instructions, &defaultSec, &videoURL, &e.IsCustom, &coachID,
			&e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("failed to scan exercise: %w", err)
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
	return exercises, total, nil
}

// GetByID retrieves an exercise entry by its unique identifier.
func (r *ExerciseRepository) GetByID(ctx context.Context, id string) (*training.ExerciseEntry, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE id = ?`, id)

	e := &training.ExerciseEntry{}
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

// Create inserts a new custom exercise entry for a coach.
func (r *ExerciseRepository) Create(ctx context.Context, e *training.ExerciseEntry) error {
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

// buildWhereClause constructs the WHERE clause and args for filtered exercise queries.
func (r *ExerciseRepository) buildWhereClause(filter training.ExerciseFilter) (string, []interface{}) {
	var conditions []string
	var args []interface{}

	// Coach scoping: global exercises + coach's custom exercises
	if filter.CoachID != "" {
		conditions = append(conditions, "(is_custom = 0 OR coach_id = ?)")
		args = append(args, filter.CoachID)
	} else {
		conditions = append(conditions, "is_custom = 0")
	}

	if filter.BodyPart != "" {
		conditions = append(conditions, "body_part = ?")
		args = append(args, filter.BodyPart)
	}

	if filter.Equipment != "" {
		conditions = append(conditions, "equipment = ?")
		args = append(args, filter.Equipment)
	}

	if filter.Difficulty != "" {
		conditions = append(conditions, "difficulty = ?")
		args = append(args, filter.Difficulty)
	}

	if filter.Search != "" {
		conditions = append(conditions, "(name LIKE ? OR description LIKE ?)")
		search := "%" + filter.Search + "%"
		args = append(args, search, search)
	}

	if len(conditions) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(conditions, " AND "), args
}
