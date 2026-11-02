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
		 default_sec, video_url, image_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library` + where + ` ORDER BY name LIMIT $1 OFFSET $2`

	args = append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list exercises: %w", err)
	}
	defer rows.Close()

	exercises := make([]*training.ExerciseEntry, 0)
	for rows.Next() {
		e := &training.ExerciseEntry{}
		var bodyPart, equipment, difficulty, category, videoURL, imageURL, coachID sql.NullString
		var defaultSec sql.NullInt64
		if err := rows.Scan(&e.ID, &e.Slug, &e.Name, &e.Description, &e.Mode, &bodyPart,
			&e.MuscleGroups, &e.SecondaryMuscles, &equipment, &difficulty, &category,
			&e.Instructions, &defaultSec, &videoURL, &imageURL, &e.IsCustom, &coachID,
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
	return exercises, total, nil
}

// GetByID retrieves an exercise entry by its unique identifier.
func (r *ExerciseRepository) GetByID(ctx context.Context, id string) (*training.ExerciseEntry, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, slug, name, description, mode, body_part, muscle_groups,
		 secondary_muscles, equipment, difficulty, category, instructions,
		 default_sec, video_url, image_url, is_custom, coach_id, created_at, updated_at
		 FROM exercise_library WHERE id = $3`, id)

	e := &training.ExerciseEntry{}
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

// Create inserts a new custom exercise entry for a coach.
func (r *ExerciseRepository) Create(ctx context.Context, e *training.ExerciseEntry) error {
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

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO exercise_library
		 (id, slug, name, description, mode, body_part, muscle_groups, secondary_muscles,
		  equipment, difficulty, category, instructions, default_sec, video_url, image_url,
		  is_custom, coach_id, created_at, updated_at)
		 VALUES ($4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())`,
		e.ID, e.Slug, e.Name, e.Description, e.Mode, bodyPart, e.MuscleGroups,
		e.SecondaryMuscles, equipment, difficulty, category, e.Instructions,
		defaultSec, videoURL, imageURL, e.IsCustom, coachID)
	if err != nil {
		return fmt.Errorf("failed to create exercise: %w", err)
	}
	return nil
}

// Update updates an existing custom exercise entry.
func (r *ExerciseRepository) Update(ctx context.Context, e *training.ExerciseEntry) error {
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

	res, err := r.db.ExecContext(ctx,
		`UPDATE exercise_library
		 SET slug = $21, name = $22, description = $23, mode = $24, body_part = $25, muscle_groups = $26,
		     secondary_muscles = $27, equipment = $28, difficulty = $29, category = $30, instructions = $31,
		     default_sec = $32, video_url = $33, image_url = $34, is_custom = $35, coach_id = $36,
		     updated_at = NOW()
		 WHERE id = $37`,
		e.Slug, e.Name, e.Description, e.Mode, bodyPart, e.MuscleGroups,
		e.SecondaryMuscles, equipment, difficulty, category, e.Instructions,
		defaultSec, videoURL, imageURL, e.IsCustom, coachID, e.ID)
	if err != nil {
		return fmt.Errorf("failed to update exercise: %w", err)
	}
	// Fail loud: an UPDATE that matches no row must not silently report success.
	// Mirrors the NotFound pattern in user/repository.go Update and ExerciseRepository.Delete.
	if n, _ := res.RowsAffected(); n == 0 {
		return errors.NotFound("Exercise", e.ID)
	}
	return nil
}

// Delete removes an exercise entry by ID.
func (r *ExerciseRepository) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM exercise_library WHERE id = $38`, id)
	if err != nil {
		return fmt.Errorf("failed to delete exercise: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return errors.NotFound("Exercise", id)
	}
	return nil
}

// buildWhereClause constructs the WHERE clause and args for filtered exercise queries.
func (r *ExerciseRepository) buildWhereClause(filter training.ExerciseFilter) (string, []interface{}) {
	var conditions []string
	var args []interface{}

	// Coach scoping: global exercises + coach's custom exercises
	if filter.CoachID != "" {
		conditions = append(conditions, "(is_custom = 0 OR coach_id = $39)")
		args = append(args, filter.CoachID)
	} else {
		conditions = append(conditions, "is_custom = 0")
	}

	if filter.BodyPart != "" {
		conditions = append(conditions, "body_part = $40")
		args = append(args, filter.BodyPart)
	}

	if filter.Equipment != "" {
		conditions = append(conditions, "equipment = $41")
		args = append(args, filter.Equipment)
	}

	if filter.Difficulty != "" {
		conditions = append(conditions, "difficulty = $42")
		args = append(args, filter.Difficulty)
	}

	if filter.Search != "" {
		conditions = append(conditions, "(name LIKE $43 OR description LIKE $44)")
		search := "%" + filter.Search + "%"
		args = append(args, search, search)
	}

	if len(conditions) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(conditions, " AND "), args
}
