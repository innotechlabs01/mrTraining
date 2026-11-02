// Package ally holds the application logic for the ally (Alianzas) domain.
package ally

import (
	"context"

	appertin "github.com/innotechlabs01/mr-training-api/internal/domain/audit"

	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"

	allydomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally"
)

// Service handles ally business logic.
type Service struct {
	repo allydomain.Repository
}

// NewService creates a new ally service.
func NewService(repo allydomain.Repository) *Service {
	return &Service{repo: repo}
}

// CreateAlly registers a new ally for a coach and links them through a
// coach-ally relationship. The ally, its optional owner membership and the
// relationship are created atomically together with the audit event.
func (s *Service) CreateAlly(ctx context.Context, in allydomain.CreateInput, actorID string) (*allydomain.Ally, *allydomain.Relationship, error) {
	if in.CoachID == "" {
		return nil, nil, apperrors.BadRequest("coach ID is required")
	}
	if in.LegalName == "" || in.CommercialName == "" {
		return nil, nil, apperrors.BadRequest("legal and commercial name are required")
	}

	ev := appertin.NewEvent("ally", "ally.created", actorID, map[string]any{
		"legal_name":      in.LegalName,
		"commercial_name": in.CommercialName,
		"category":        in.Category,
		"owner_user_id":   in.OwnerUserID,
	})

	ally, relationship, err := s.repo.CreateAllyWithRelationship(ctx, in, ev)
	if err != nil {
		return nil, nil, err
	}
	return ally, relationship, nil
}

// ListByCoach returns all allies of a coach.
func (s *Service) ListByCoach(ctx context.Context, coachID string) ([]*allydomain.Summary, error) {
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	return s.repo.ListByCoach(ctx, coachID)
}

// GetByIDForCoach returns an ally detail scoped to a coach. Foreign records are
// reported as not-found so the API never leaks another coach's allies.
func (s *Service) GetByIDForCoach(ctx context.Context, relationshipID, coachID string) (*allydomain.Detail, error) {
	if relationshipID == "" || coachID == "" {
		return nil, apperrors.BadRequest("relationship ID and coach ID are required")
	}
	return s.repo.GetByIDForCoach(ctx, relationshipID, coachID)
}

// ListByAllyUser returns all allies a user owns or belongs to.
func (s *Service) ListByAllyUser(ctx context.Context, userID string) ([]*allydomain.Summary, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	return s.repo.ListByAllyUser(ctx, userID)
}
