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
	repo      *Repository
	clerkUser interface {
		GetUser(ctx context.Context, userID string) (email, name string, err error)
	}
}

// NewTenantResolver creates a TenantResolver backed by the user repository.
// clerkUser is optional; when nil, auto-provisioning in RequireTenantContext
// will skip fetching email/name from Clerk and use defaults.
func NewTenantResolver(repo *Repository, clerkUser ...interface {
	GetUser(ctx context.Context, userID string) (email, name string, err error)
}) middleware.TenantResolver {
	r := &tenantResolver{repo: repo}
	if len(clerkUser) > 0 {
		r.clerkUser = clerkUser[0]
	}
	return r
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

// EnsureCoach idempotently creates a coaches row for a coach user.
// Implements middleware.Provisioner so auto-provisioning works in
// RequireTenantContext when the Clerk webhook missed user.created.
func (r *tenantResolver) EnsureCoach(ctx context.Context, userID, email, name string) error {
	return r.repo.EnsureCoach(ctx, userID, email, name)
}

// GetUser fetches identity data (email, name) from Clerk for auto-provisioning.
// Implements middleware.Provisioner.GetUser.
func (r *tenantResolver) GetUser(ctx context.Context, userID string) (email, name string, err error) {
	if r.clerkUser == nil {
		return "", "", nil
	}
	return r.clerkUser.GetUser(ctx, userID)
}

// AthleteHasActiveCoach reports whether an active coach_athlete_links row
// exists between the athlete and the requested coach.
func (r *tenantResolver) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return r.repo.AthleteHasActiveCoach(ctx, athleteID, coachID)
}
