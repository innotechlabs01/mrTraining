// Package user provides the application service layer for the user domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package user

import (
	"context"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// IdentityProvider fetches identity data (email, name) from the auth
// provider (Clerk Backend API). It is a port so tests can mock it.
type IdentityProvider interface {
	GetUser(ctx context.Context, userID string) (email, name string, err error)
}

// MetadataWriter mirrors application metadata into the auth provider's
// PUBLIC metadata. Only the backend holds the provider secret, so this is the
// only place where the role can be set authoritatively.
type MetadataWriter interface {
	MergePublicMetadata(ctx context.Context, userID string, patch map[string]interface{}) error
}

// Service implements user-related business operations.
// It depends on the user.Repository interface, making it testable with mocks.
type Service struct {
	repo     user.Repository
	identity IdentityProvider
	metadata MetadataWriter
}

// NewService creates a new user application service with the given repository.
func NewService(repo user.Repository, identity IdentityProvider) *Service {
	return &Service{repo: repo, identity: identity}
}

// WithMetadataWriter injects the auth-provider metadata writer.
func (s *Service) WithMetadataWriter(w MetadataWriter) *Service {
	s.metadata = w
	return s
}

// GetCurrentUser returns the authenticated user's profile along with
// the role-specific profile (coach or athlete). If the user has neither,
// only the base user is returned.
//
// Auto-provisioning (defense in depth): if the Clerk webhook missed the
// user.created event and the base row or the role profile is missing, the
// service seeds them from the auth provider so a newly registered coach or
// athlete never lands on a broken dashboard. fallbackRole comes from the
// verified JWT claims.
func (s *Service) GetCurrentUser(ctx context.Context, userID, fallbackRole string) (*user.User, *user.Coach, *user.AthleteProfile, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		appErr, ok := err.(*errors.AppError)
		if !ok || appErr.Status != 404 || fallbackRole == "" {
			return nil, nil, nil, fmt.Errorf("get current user: %w", err)
		}
		// Missing base row — provision from the identity provider.
		email, name := "", ""
		if s.identity != nil {
			if e, n, ierr := s.identity.GetUser(ctx, userID); ierr == nil {
				email, name = e, n
			}
		}
		if perr := s.repo.EnsureUser(ctx, userID, email, name, fallbackRole); perr != nil {
			return nil, nil, nil, fmt.Errorf("provision user: %w", perr)
		}
		u, err = s.repo.GetByID(ctx, userID)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("get current user after provision: %w", err)
		}
	}

	var coach *user.Coach
	var athlete *user.AthleteProfile

	switch u.Role {
	case "coach":
		coach, err = s.repo.GetCoach(ctx, userID)
		if err != nil {
			// Coach profile may not exist yet — provision it instead of
			// leaving the coach on a broken dashboard.
			email, name := u.Email, u.Name
			if s.identity != nil {
				if e, n, ierr := s.identity.GetUser(ctx, userID); ierr == nil {
					email, name = e, n
				}
			}
			if perr := s.repo.EnsureCoach(ctx, userID, email, name); perr == nil {
				coach, err = s.repo.GetCoach(ctx, userID)
				if err != nil {
					coach = nil
				}
			} else {
				coach = nil
			}
		}
	case "athlete":
		athlete, err = s.repo.GetAthleteProfile(ctx, userID)
		if err != nil {
			email, name := u.Email, u.Name
			if s.identity != nil {
				if e, n, ierr := s.identity.GetUser(ctx, userID); ierr == nil {
					email, name = e, n
				}
			}
			if perr := s.repo.EnsureAthleteProfile(ctx, userID, email, name); perr == nil {
				athlete, err = s.repo.GetAthleteProfile(ctx, userID)
				if err != nil {
					athlete = nil
				}
			} else {
				athlete = nil
			}
		}
	}

	return u, coach, athlete, nil
}

// UpdateProfile updates the authenticated user's name and avatar URL.
func (s *Service) UpdateProfile(ctx context.Context, userID string, req dto.UpdateProfileRequest) error {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user for update: %w", err)
	}

	u.Name = req.Name
	u.AvatarURL = req.AvatarURL

	if err := s.repo.Update(ctx, u); err != nil {
		return fmt.Errorf("update user profile: %w", err)
	}

	return nil
}

// UpdateCoachProfile updates the coach's extended profile fields.
// Returns NotFound if the user is not a coach.
func (s *Service) UpdateCoachProfile(ctx context.Context, userID string, req dto.UpdateCoachRequest) error {
	c, err := s.repo.GetCoach(ctx, userID)
	if err != nil {
		return fmt.Errorf("get coach for update: %w", err)
	}

	c.Bio = req.Bio
	c.Specializations = req.Specializations
	c.Certifications = req.Certifications
	c.ExperienceYears = req.ExperienceYears
	c.MaxAthletes = req.MaxAthletes

	// The repository's Update for coaches is not yet implemented,
	// so we return a not-implemented error for now.
	// TODO: Add coach update to the repository interface and infrastructure layer.
	return errors.Internal("coach profile update not yet implemented")
}

// UpdateAthleteProfile updates the athlete's extended profile fields.
// Returns NotFound if the user is not an athlete.
func (s *Service) UpdateAthleteProfile(ctx context.Context, userID string, req dto.UpdateAthleteRequest) error {
	ap, err := s.repo.GetAthleteProfile(ctx, userID)
	if err != nil {
		return fmt.Errorf("get athlete profile for update: %w", err)
	}

	ap.Sport = req.Sport
	ap.ExperienceLevel = req.ExperienceLevel
	ap.HeightCm = req.HeightCm
	ap.WeightKg = req.WeightKg
	ap.EmergencyContact = req.EmergencyContact
	ap.EmergencyPhone = req.EmergencyPhone
	ap.Modality = req.Modality
	ap.ScheduleDays = req.ScheduleDays
	ap.ScheduleTime = req.ScheduleTime

	if err := s.repo.UpdateAthleteProfile(ctx, userID, ap); err != nil {
		return fmt.Errorf("update athlete profile: %w", err)
	}
	return nil
}

// ListCoaches returns all active coaches. Pagination is applied in-memory
// since the repository returns all active coaches. For production, the
// repository should accept offset/limit parameters.
func (s *Service) ListCoaches(ctx context.Context, page, limit int) ([]*user.Coach, int, error) {
	coaches, err := s.repo.ListCoaches(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("list coaches: %w", err)
	}

	total := len(coaches)

	// Apply pagination
	start := (page - 1) * limit
	if start >= total {
		return []*user.Coach{}, total, nil
	}

	end := start + limit
	if end > total {
		end = total
	}

	return coaches[start:end], total, nil
}

// GetAthletesByCoach returns all active athletes linked to the given coach.
func (s *Service) GetAthletesByCoach(ctx context.Context, coachID string) ([]*user.AthleteProfile, error) {
	athletes, err := s.repo.ListAthletesByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("get athletes by coach: %w", err)
	}
	return athletes, nil
}

// GetUser returns a user by ID. Intended for admin use.
func (s *Service) GetUser(ctx context.Context, userID string) (*user.User, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return u, nil
}

// EnsureUser idempotently creates the base users row if missing.
// Used for auto-provisioning when the Clerk webhook missed user.created.
func (s *Service) EnsureUser(ctx context.Context, id, email, name, role string) error {
	if err := s.repo.EnsureUser(ctx, id, email, name, role); err != nil {
		return fmt.Errorf("ensure user: %w", err)
	}
	return nil
}

// EnsureCoach idempotently creates the coach profile row with a generated
// coach_code. Used for coach provisioning.
func (s *Service) EnsureCoach(ctx context.Context, userID, email, name string) error {
	if err := s.repo.EnsureCoach(ctx, userID, email, name); err != nil {
		return fmt.Errorf("ensure coach: %w", err)
	}
	return nil
}

// EnsureAthleteProfile idempotently creates the athlete_profiles row.
func (s *Service) EnsureAthleteProfile(ctx context.Context, userID, email, name string) error {
	if err := s.repo.EnsureAthleteProfile(ctx, userID, email, name); err != nil {
		return fmt.Errorf("ensure athlete profile: %w", err)
	}
	return nil
}

// GetCoachByID retrieves the coach profile for a user, including coach_code.
func (s *Service) GetCoachByID(ctx context.Context, userID string) (*user.Coach, error) {
	c, err := s.repo.GetCoach(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get coach: %w", err)
	}
	return c, nil
}

// ActivateCommand is the input to the coach activation use case.
type ActivateCommand struct {
	// UserID is the authenticated Clerk user id. It always comes from the
	// verified token — never from the request body — so a client can only
	// activate itself.
	UserID string
	// Email and Name are the identity fields resolved from the auth provider.
	// They are optional: when empty they are fetched from the provider.
	Email string
	Name  string
}

// ActivateResult is the outcome of the coach activation use case.
type ActivateResult struct {
	CoachID   string `json:"coach_id"`
	CoachCode string `json:"coach_code"`
	// Created is true when this call provisioned the coach profile.
	Created bool `json:"created"`
}

// ActivateCoach provisions the coach profile for the authenticated user and
// mirrors the role + coach code into the auth provider's PUBLIC metadata.
//
// The role is decided here, server-side:
//   - an account already provisioned as an athlete is NEVER promoted to coach
//   - an account already provisioned as coach is returned as-is (idempotent)
//   - a brand new account is provisioned as coach
//
// Because the user id always comes from the verified token, a client cannot
// provision a coach profile for somebody else.
func (s *Service) ActivateCoach(ctx context.Context, cmd ActivateCommand) (*ActivateResult, error) {
	if cmd.UserID == "" {
		return nil, errors.BadRequest("user id is required")
	}

	email, name := cmd.Email, cmd.Name
	if (email == "" || name == "") && s.identity != nil {
		if e, n, ierr := s.identity.GetUser(ctx, cmd.UserID); ierr == nil {
			if email == "" {
				email = e
			}
			if name == "" {
				name = n
			}
		}
	}

	existing, err := s.repo.GetByID(ctx, cmd.UserID)
	created := false
	switch {
	case err != nil:
		// No base row yet — provision it below.
		created = true
	case existing.IsAthlete():
		return nil, errors.Conflict("this account is already registered as an athlete")
	}

	if created {
		if perr := s.repo.EnsureUser(ctx, cmd.UserID, email, name, "coach"); perr != nil {
			return nil, fmt.Errorf("provision user: %w", perr)
		}
	}
	if perr := s.repo.EnsureCoach(ctx, cmd.UserID, email, name); perr != nil {
		return nil, fmt.Errorf("provision coach: %w", perr)
	}

	coach, err := s.repo.GetCoach(ctx, cmd.UserID)
	if err != nil {
		return nil, fmt.Errorf("get coach after activation: %w", err)
	}

	// Mirror the role + coach code into the provider's PUBLIC metadata so the
	// frontend can read them without hitting the database. Best-effort: the
	// profile is already persisted, and the webhook retries the mirror.
	if s.metadata != nil {
		_ = s.metadata.MergePublicMetadata(ctx, cmd.UserID, map[string]interface{}{
			"role":      "coach",
			"coachCode": coach.CoachCode,
		})
	}

	return &ActivateResult{
		CoachID:   coach.ID,
		CoachCode: coach.CoachCode,
		Created:   created,
	}, nil
}

// SaveCoachOnboarding validates and persists the answers collected by the
// coach onboarding flow.
func (s *Service) SaveCoachOnboarding(ctx context.Context, userID string, onboarding user.CoachOnboarding) (*user.Coach, error) {
	if userID == "" {
		return nil, errors.BadRequest("user id is required")
	}

	coach, err := s.repo.GetCoach(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get coach: %w", err)
	}
	if err := coach.ApplyOnboarding(onboarding); err != nil {
		return nil, errors.ValidationFailed(err.Error())
	}
	if err := s.repo.UpdateCoachOnboarding(ctx, userID, coach); err != nil {
		return nil, fmt.Errorf("save coach onboarding: %w", err)
	}
	return coach, nil
}

// UpdateUserAvatar updates the avatar URL for a user.
func (s *Service) UpdateUserAvatar(ctx context.Context, userID, avatarURL string) error {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user for avatar update: %w", err)
	}
	u.AvatarURL = avatarURL
	if err := s.repo.Update(ctx, u); err != nil {
		return fmt.Errorf("update user avatar: %w", err)
	}
	return nil
}

// SoftDeleteUser marks the user and their coach profile as inactive.
func (s *Service) SoftDeleteUser(ctx context.Context, userID string) error {
	if err := s.repo.SoftDeleteUser(ctx, userID); err != nil {
		return fmt.Errorf("soft delete user: %w", err)
	}
	return nil
}

// SetExecutor propagates a transactional SQL executor into the user repository.
func (s *Service) SetExecutor(exec database.Executor) *Service {
	repo := s.repo
	if r, ok := s.repo.(interface{ WithExecutor(database.Executor) user.Repository }); ok {
		repo = r.WithExecutor(exec)
	} else if r, ok := s.repo.(interface{ SetExecutor(database.Executor) }); ok {
		r.SetExecutor(exec)
	}
	return &Service{
		repo:     repo,
		identity: s.identity,
	}
}
