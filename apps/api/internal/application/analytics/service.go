// Package analytics provides application service for coach analytics domain.
package analytics

import (
	"context"
	"fmt"

	analyticsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/analytics"
)

type Service struct {
	repo analyticsdomain.Repository
}

func NewService(repo analyticsdomain.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetDashboardSummary(ctx context.Context, coachID string) (*analyticsdomain.DashboardSummary, error) {
	if coachID == "" {
		return nil, fmt.Errorf("coachID is required")
	}
	return s.repo.GetDashboardSummary(ctx, coachID)
}

func (s *Service) GetHRZones(ctx context.Context, athleteID string) ([]analyticsdomain.HRZone, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athleteID is required")
	}
	return s.repo.GetHRZones(ctx, athleteID)
}

func (s *Service) GetFatigueMap(ctx context.Context, athleteID string) ([]analyticsdomain.FatigueMap, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athleteID is required")
	}
	return s.repo.GetFatigueMap(ctx, athleteID)
}

func (s *Service) GetOneRM(ctx context.Context, athleteID string) ([]analyticsdomain.OneRM, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athleteID is required")
	}
	return s.repo.GetOneRM(ctx, athleteID)
}

func (s *Service) GetTrainingSummary(ctx context.Context, coachID string) (*analyticsdomain.TrainingSummary, error) {
	if coachID == "" {
		return nil, fmt.Errorf("coachID is required")
	}
	return s.repo.GetTrainingSummary(ctx, coachID)
}

func (s *Service) GetEffort(ctx context.Context, athleteID string) ([]analyticsdomain.Effort, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athleteID is required")
	}
	return s.repo.GetEffort(ctx, athleteID)
}
