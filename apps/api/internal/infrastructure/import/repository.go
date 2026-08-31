package importdata

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/importdata"
)

// Repository implements the importdata.Repository interface using libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new import repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateImportJob inserts a new import job.
func (r *Repository) CreateImportJob(ctx context.Context, job *importdata.ImportJob) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO import_jobs (id, athlete_id, source, status, workouts_imported, exercises_imported, error_message, created_at, completed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
	`, job.ID, job.AthleteID, job.Source, job.Status, job.WorkoutsImported, job.ExercisesImported, job.ErrorMessage, job.CompletedAt)
	if err != nil {
		return fmt.Errorf("failed to create import job: %w", err)
	}
	return nil
}

// GetImportJob returns an import job by ID.
func (r *Repository) GetImportJob(ctx context.Context, id string) (*importdata.ImportJob, error) {
	var job importdata.ImportJob
	var errorMessage, completedAt sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, athlete_id, source, status, workouts_imported, exercises_imported, error_message, created_at, completed_at
		FROM import_jobs
		WHERE id = ?
	`, id).Scan(&job.ID, &job.AthleteID, &job.Source, &job.Status, &job.WorkoutsImported, &job.ExercisesImported, &errorMessage, &job.CreatedAt, &completedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("import job not found")
		}
		return nil, fmt.Errorf("failed to get import job: %w", err)
	}
	if errorMessage.Valid {
		job.ErrorMessage = &errorMessage.String
	}
	if completedAt.Valid {
		job.CompletedAt = &completedAt.String
	}
	return &job, nil
}

// ListImportJobs returns all import jobs for an athlete.
func (r *Repository) ListImportJobs(ctx context.Context, athleteID string) ([]*importdata.ImportJob, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, athlete_id, source, status, workouts_imported, exercises_imported, error_message, created_at, completed_at
		FROM import_jobs
		WHERE athlete_id = ?
		ORDER BY created_at DESC
	`, athleteID)
	if err != nil {
		return []*importdata.ImportJob{}, nil
	}
	defer rows.Close()

	var jobs []*importdata.ImportJob
	for rows.Next() {
		var job importdata.ImportJob
		var errorMessage, completedAt sql.NullString
		if err := rows.Scan(&job.ID, &job.AthleteID, &job.Source, &job.Status, &job.WorkoutsImported, &job.ExercisesImported, &errorMessage, &job.CreatedAt, &completedAt); err != nil {
			return nil, fmt.Errorf("failed to scan import job: %w", err)
		}
		if errorMessage.Valid {
			job.ErrorMessage = &errorMessage.String
		}
		if completedAt.Valid {
			job.CompletedAt = &completedAt.String
		}
		jobs = append(jobs, &job)
	}
	return jobs, nil
}

// UpdateImportJob updates an import job.
func (r *Repository) UpdateImportJob(ctx context.Context, job *importdata.ImportJob) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE import_jobs
		SET status = ?, workouts_imported = ?, exercises_imported = ?, error_message = ?, completed_at = ?
		WHERE id = ?
	`, job.Status, job.WorkoutsImported, job.ExercisesImported, job.ErrorMessage, job.CompletedAt, job.ID)
	if err != nil {
		return fmt.Errorf("failed to update import job: %w", err)
	}
	return nil
}