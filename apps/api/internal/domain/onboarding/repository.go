package onboarding

import "context"

// Repository defines data access for onboarding data.
type Repository interface {
	Save(ctx context.Context, data *OnboardingData) error
	Get(ctx context.Context, athleteID string) (*OnboardingData, error)
}
