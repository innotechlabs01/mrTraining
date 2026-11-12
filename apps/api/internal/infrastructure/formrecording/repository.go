// Package formrecording provides the libSQL-backed persistence
// implementation for the form recording domain.
package formrecording

import (
	"context"
	"database/sql"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/formrecording"
)

// Repository implements the formrecording.Repository interface.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new form recording repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}
// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
// When set, all repository queries run against this executor instead of the
// connection pool.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) domain.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx (injected by a
// UnitOfWork) rather than the connection pool.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// Insert persists a form recording row.
func (r *Repository) Insert(ctx context.Context, rec *domain.FormRecording) error {
	if r.exec == nil {
		return nil
	}

	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO form_recordings (id, athlete_id, exercise_id, workout_id, form_score, form_metrics, video_url, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
