// Package today provides application services for the Today dashboard.
package today

import (
	"context"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/today"
)

// Service handles Today business logic.
type Service struct {
	repo today.Repository
}

// NewService creates a new today service.
func NewService(repo today.Repository) *Service {
	return &Service{repo: repo}
}

// GetTodayData returns today's aggregated view for an athlete.
func (s *Service) GetTodayData(ctx context.Context, athleteID string) (*today.TodayData, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.GetTodayData(ctx, athleteID)
}
