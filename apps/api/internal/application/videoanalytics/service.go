package videoanalytics

import (
	"context"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/videoanalytics"
)

// Service implements the video analytics business logic.
type Service struct {
	repo domain.Repository
}

// NewService creates a new video analytics service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// TrackSession records a new video analysis session.
func (s *Service) TrackSession(ctx context.Context, session *domain.SessionAnalysis) error {
	if session.ID == "" {
		session.ID = fmt.Sprintf("va-%d", time.Now().UnixNano())
	}
	return s.repo.CreateSession(ctx, session)
}

// GetSummary returns analytics summary for an athlete.
func (s *Service) GetSummary(ctx context.Context, athleteID string) (*domain.AnalyticsSummary, error) {
	return s.repo.GetSummary(ctx, athleteID)
}

// GetPerExercise returns per-exercise analytics for an athlete.
func (s *Service) GetPerExercise(ctx context.Context, athleteID string) ([]*domain.ExerciseAnalytics, error) {
	return s.repo.GetPerExercise(ctx, athleteID)
}

// GetSessions returns sessions for an athlete.
func (s *Service) GetSessions(ctx context.Context, athleteID string, limit int, offset int) ([]*domain.SessionAnalysis, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.ListSessionsByAthlete(ctx, athleteID, limit, offset)
}
