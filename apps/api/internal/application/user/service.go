// Package user provides the application service layer for the user domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package user

import (
	"context"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// Service implements user-related business operations.
// It depends on the user.Repository interface, making it testable with mocks.
type Service struct {
	repo user.Repository
}

// NewService creates a new user application service with the given repository.
func NewService(repo user.Repository) *Service {
	return &Service{repo: repo}
}

// GetCurrentUser returns the authenticated user's profile along with
// the role-specific profile (coach or athlete). If the user has neither,
// only the base user is returned.
func (s *Service) GetCurrentUser(ctx context.Context, userID string) (*user.User, *user.Coach, *user.AthleteProfile, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("get current user: %w", err)
	}

	var coach *user.Coach
	var athlete *user.AthleteProfile

	switch u.Role {
	case "coach":
		coach, err = s.repo.GetCoach(ctx, userID)
		if err != nil {
			// Coach profile may not exist yet; don't fail the whole request
			coach = nil
		}
	case "athlete":
		athlete, err = s.repo.GetAthleteProfile(ctx, userID)
		if err != nil {
			athlete = nil
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
