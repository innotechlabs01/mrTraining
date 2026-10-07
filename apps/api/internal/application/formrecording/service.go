// Package formrecording implements the application service for the
// form recording domain (athlete form-check video uploads).
package formrecording

import (
	"context"
	"errors"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/formrecording"
)

// UploadInput carries the validated metadata for a form recording upload.
type UploadInput struct {
	ExerciseID  string
	WorkoutID   string
	FormScore   float64
	FormMetrics string // raw JSON, must already be validated by the caller
	VideoURL    string
}

// Service implements the form recording business logic.
type Service struct {
	repo domain.Repository
}

// NewService creates a new form recording service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// Upload registers a form recording after its video file has been saved
// to disk by the HTTP layer (mirrors the challenge video upload pattern).
func (s *Service) Upload(ctx context.Context, athleteID string, in UploadInput) (*domain.FormRecording, error) {
	if athleteID == "" {
		return nil, errors.New("user not authenticated")
	}
	if in.ExerciseID == "" {
		return nil, errors.New("exerciseId is required")
	}
	if in.VideoURL == "" {
		return nil, errors.New("video file is required")
	}

	if in.FormMetrics == "" {
		in.FormMetrics = "{}"
	}

	rec := &domain.FormRecording{
		ID:          fmt.Sprintf("fr-%d", time.Now().UnixNano()),
		AthleteID:   athleteID,
		ExerciseID:  in.ExerciseID,
		WorkoutID:   in.WorkoutID,
		FormScore:   in.FormScore,
		FormMetrics: in.FormMetrics,
		VideoURL:    in.VideoURL,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}

	if err := s.repo.Insert(ctx, rec); err != nil {
		return nil, fmt.Errorf("insert recording: %w", err)
	}

	return rec, nil
}
