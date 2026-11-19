// Package invite provides the application service layer for the invite domain.
package invite

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/domain/invite"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service implements invite-related business operations.
type Service struct {
	repo invite.Repository
}

// NewService creates a new invite application service with the given repository.
func NewService(repo invite.Repository) *Service {
	return &Service{repo: repo}
}

// GetByCode retrieves an invite by its code.
func (s *Service) GetByCode(ctx context.Context, code string) (*invite.Invite, error) {
	if strings.TrimSpace(code) == "" {
		return nil, errors.BadRequest("code is required")
	}

	inv, err := s.repo.GetByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get invite by code: %w", err)
	}
	return inv, nil
}

// ValidateCode checks whether the given invite code is valid and active.
func (s *Service) ValidateCode(ctx context.Context, code string) (bool, error) {
	if strings.TrimSpace(code) == "" {
		return false, errors.BadRequest("code is required")
	}

	valid, err := s.repo.ValidateCode(ctx, code)
	if err != nil {
		return false, fmt.Errorf("validate invite code: %w", err)
	}
	return valid, nil
}

// AcceptInvite validates the code and links an athlete to the coach.
func (s *Service) AcceptInvite(ctx context.Context, code, athleteID string) (*invite.AcceptResult, error) {
	if strings.TrimSpace(code) == "" {
		return nil, errors.BadRequest("code is required")
	}
	if strings.TrimSpace(athleteID) == "" {
		return nil, errors.BadRequest("athlete_id is required")
	}

	result, err := s.repo.AcceptInvite(ctx, code, athleteID)
	if err != nil {
		return nil, fmt.Errorf("accept invite: %w", err)
	}
	return result, nil
}

// GetCoachIDByAthleteID resolves the coach linked to an athlete via coach_athlete_links.
func (s *Service) GetCoachIDByAthleteID(ctx context.Context, athleteID string) (string, error) {
	if strings.TrimSpace(athleteID) == "" {
		return "", errors.BadRequest("athlete_id is required")
	}
	return s.repo.GetCoachIDByAthleteID(ctx, athleteID)
}

// CreatePendingInvite stores a clerk-issued invitation for a coach.
func (s *Service) CreatePendingInvite(ctx context.Context, inv *invite.PendingInvite) error {
	if inv.ID == "" || inv.CoachID == "" || inv.Email == "" {
		return errors.BadRequest("id, coach_id and email are required")
	}
	if inv.Status == "" {
		inv.Status = "pending"
	}
	if inv.ExpiresAt == "" {
		inv.ExpiresAt = time.Now().Add(7 * 24 * time.Hour).Format(time.RFC3339)
	}
	if inv.CreatedAt == "" {
		inv.CreatedAt = time.Now().Format(time.RFC3339)
	}
	if err := s.repo.CreatePendingInvite(ctx, inv); err != nil {
		return fmt.Errorf("create pending invite: %w", err)
	}
	return nil
}
