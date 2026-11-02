package dashboard

import (
	"context"

	dashboarddomain "github.com/innotechlabs01/mr-training-api/internal/domain/dashboard"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

type Service struct {
	repo dashboarddomain.Repository
}

func NewService(repo dashboarddomain.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetSummary(ctx context.Context, coachID string) (*dashboarddomain.DashboardSummary, error) {
	if coachID == "" {
		return nil, errors.BadRequest("coach_id required")
	}
	return s.repo.GetSummary(ctx, coachID)
}