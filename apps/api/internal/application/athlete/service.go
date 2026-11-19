// Package athlete provides the application service layer for the athlete domain.
// It orchestrates reads across the workout, message, and dashboard sub-domains,
// keeping domain rules decoupled from transport concerns.
package athlete

import (
	"context"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service implements athlete-related read operations.
// It depends on the athlete repository interface, making it testable with mocks.
type Service struct {
	repo athlete.Repository
}

// NewService creates a new athlete application service.
func NewService(repo athlete.Repository) *Service {
	return &Service{repo: repo}
}

// ListWorkouts returns workout summaries for an athlete.
func (s *Service) ListWorkouts(ctx context.Context, athleteID string) ([]*athlete.WorkoutSummary, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, errors.BadRequest("athlete_id is required")
	}
	workouts, err := s.repo.GetWorkouts(ctx, athleteID)
	if err != nil {
		return nil, err
	}
	if workouts == nil {
		workouts = []*athlete.WorkoutSummary{}
	}
	return workouts, nil
}

// GetMetrics returns time-series metrics for an athlete.
func (s *Service) GetMetrics(ctx context.Context, athleteID string) ([]*athlete.MetricPoint, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, errors.BadRequest("athlete_id is required")
	}
	metrics, err := s.repo.GetMetrics(ctx, athleteID)
	if err != nil {
		return nil, err
	}
	if metrics == nil {
		metrics = []*athlete.MetricPoint{}
	}
	return metrics, nil
}

// ListMessages returns message threads for an athlete.
func (s *Service) ListMessages(ctx context.Context, athleteID string) ([]*athlete.MessageThread, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, errors.BadRequest("athlete_id is required")
	}
	threads, err := s.repo.GetMessages(ctx, athleteID)
	if err != nil {
		return nil, err
	}
	if threads == nil {
		threads = []*athlete.MessageThread{}
	}
	return threads, nil
}
