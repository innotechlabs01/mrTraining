// Package onboarding provides application services for athlete onboarding.
package onboarding

import (
	"context"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/onboarding"
)

// Service handles onboarding business logic.
type Service struct {
	repo onboarding.Repository
}

// NewService creates a new onboarding service.
func NewService(repo onboarding.Repository) *Service {
	return &Service{repo: repo}
}

// Save persists the onboarding data for an athlete.
func (s *Service) Save(ctx context.Context, athleteID string, d *onboarding.OnboardingData) error {
	if athleteID == "" {
		return fmt.Errorf("athlete ID is required")
	}
	if d.Goal == "" {
		return fmt.Errorf("goal is required")
	}
	if d.SessionsPerWeek < 1 || d.SessionsPerWeek > 7 {
		return fmt.Errorf("sessions per week must be between 1 and 7")
	}
	d.AthleteID = athleteID
	return s.repo.Save(ctx, d)
}

// Get retrieves the onboarding data for an athlete.
func (s *Service) Get(ctx context.Context, athleteID string) (*onboarding.OnboardingData, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.Get(ctx, athleteID)
}
