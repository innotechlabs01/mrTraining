package alert

import (
	"context"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/alert"
)

// Service handles alert business logic.
type Service struct {
	repo alert.Repository
}

// NewService creates a new alert service.
func NewService(repo alert.Repository) *Service {
	return &Service{repo: repo}
}

// ListAlerts returns all alerts for an athlete.
func (s *Service) ListAlerts(ctx context.Context, athleteID string) ([]*alert.Alert, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.ListAlerts(ctx, athleteID)
}