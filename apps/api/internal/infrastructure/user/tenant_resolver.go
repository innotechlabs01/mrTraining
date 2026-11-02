package user

import (
	"context"

	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// tenantResolver implements middleware.TenantResolver using the user repository.
// It resolves the tenant (coach) for an authenticated user:
//   - Coach users: their own coach profile (users.id == coaches.id).
//   - Athlete users: the coach specified per-operation via X-Coach-ID header,
//     validated against coach_athlete_links.
type tenantResolver struct {
	repo *Repository
}

// NewTenantResolver creates a TenantResolver backed by the user repository.
func NewTenantResolver(repo *Repository) middleware.TenantResolver {
	return &tenantResolver{repo: repo}
}

// GetActiveCoachID returns the coach_id for an authenticated user that is an
// active coach (users.id == coaches.id and coaches.is_active = 1).
// Returns ("", nil) when the user is not an active coach.
func (r *tenantResolver) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	isActive, err := r.repo.IsActiveCoach(ctx, userID)
	if err != nil {
		return "", err
	}
	if !isActive {
		return "", nil
	}
	return userID, nil
}

// AthleteHasActiveCoach reports whether an active coach_athlete_links row
// exists between the athlete and the requested coach.
func (r *tenantResolver) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return r.repo.AthleteHasActiveCoach(ctx, athleteID, coachID)
}
