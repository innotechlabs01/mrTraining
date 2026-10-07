// Package formrecording provides the libSQL-backed persistence
// implementation for the form recording domain.
package formrecording

import (
	"context"
	"database/sql"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/formrecording"
)

// Repository implements the formrecording.Repository interface.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new form recording repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Insert persists a form recording row.
func (r *Repository) Insert(ctx context.Context, rec *domain.FormRecording) error {
	if r.db == nil {
		return nil
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO form_recordings (id, athlete_id, exercise_id, workout_id, form_score, form_metrics, video_url, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, rec.ID, rec.AthleteID, rec.ExerciseID, nullStr(rec.WorkoutID),
		rec.FormScore, rec.FormMetrics, rec.VideoURL, rec.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert form recording: %w", err)
	}

	return nil
}

// nullStr converts an empty string to NULL for optional columns.
func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
