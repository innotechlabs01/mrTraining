package formmetrics

import (
	"context"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/formmetrics"
)

// Service implements the form metrics business logic.
type Service struct {
	repo domain.Repository
}

// NewService creates a new form metrics service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// SyncBatch receives a batch of form metrics from an athlete's device.
func (s *Service) SyncBatch(ctx context.Context, athleteID string, metrics []*domain.FormMetric) (int, int, error) {
	if len(metrics) == 0 {
		return 0, 0, nil
	}

	// Set athlete ID and generate IDs
	for _, m := range metrics {
		m.AthleteID = athleteID
		if m.ID == "" {
			m.ID = fmt.Sprintf("fm-%d", time.Now().UnixNano())
		}
		if m.RecordedAt == "" {
			m.RecordedAt = time.Now().Format(time.RFC3339)
		}
	}

	if err := s.repo.InsertBatch(ctx, metrics); err != nil {
		return 0, len(metrics), fmt.Errorf("batch insert: %w", err)
	}

	return len(metrics), 0, nil
}

// GetByAthlete returns form metrics for a specific athlete, grouped by exercise.
func (s *Service) GetByAthlete(ctx context.Context, athleteID string) ([]*domain.ExerciseFormStats, error) {
	return s.repo.GetByAthlete(ctx, athleteID)
}

// GetByCoach returns aggregated form metrics for all athletes of a coach,
// grouped by athlete+exercise.
func (s *Service) GetByCoach(ctx context.Context, coachID string) ([]*domain.CoachAthleteFormStats, error) {
	return s.repo.GetByCoach(ctx, coachID)
}

// GetConsent returns the athlete's stored AI form-recording consent ("pending" | "accepted" | "denied").
func (s *Service) GetConsent(ctx context.Context, athleteID string) (string, error) {
	return s.repo.GetConsent(ctx, athleteID)
}

// SetConsent persists the athlete's AI form-recording consent.
func (s *Service) SetConsent(ctx context.Context, athleteID, consent string) error {
	return s.repo.SetConsent(ctx, athleteID, consent)
}
