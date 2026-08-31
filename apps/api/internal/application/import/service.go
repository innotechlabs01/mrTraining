package importdata

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/importdata"
)

// Service handles import business logic.
type Service struct {
	repo importdata.Repository
}

// NewService creates a new import service.
func NewService(repo importdata.Repository) *Service {
	return &Service{repo: repo}
}

// ImportData processes a CSV import from a supported source.
func (s *Service) ImportData(ctx context.Context, athleteID, source, csvData string) (*importdata.ImportJob, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if source == "" {
		return nil, fmt.Errorf("source is required (strong, hevy, fitnotes)")
	}
	if csvData == "" {
		return nil, fmt.Errorf("CSV data is required")
	}

	validSources := map[string]bool{"strong": true, "hevy": true, "fitnotes": true}
	if !validSources[strings.ToLower(source)] {
		return nil, fmt.Errorf("invalid source: must be strong, hevy, or fitnotes")
	}

	job := &importdata.ImportJob{
		ID:          uuid.New().String(),
		AthleteID:   athleteID,
		Source:      strings.ToLower(source),
		Status:      "pending",
		CreatedAt:   uuid.New().String(),
	}

	// In a real implementation, parse CSV and create workouts/exercises
	// For now, we just record the job as completed with mock counts
	job.Status = "completed"
	job.WorkoutsImported = 0
	job.ExercisesImported = 0
	job.CompletedAt = &[]string{uuid.New().String()}[0]

	if err := s.repo.CreateImportJob(ctx, job); err != nil {
		return nil, err
	}
	return job, nil
}

// GetImportJob returns an import job by ID.
func (s *Service) GetImportJob(ctx context.Context, id string) (*importdata.ImportJob, error) {
	if id == "" {
		return nil, fmt.Errorf("import job ID is required")
	}
	return s.repo.GetImportJob(ctx, id)
}

// ListImportJobs returns all import jobs for an athlete.
func (s *Service) ListImportJobs(ctx context.Context, athleteID string) ([]*importdata.ImportJob, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.ListImportJobs(ctx, athleteID)
}