// Package commission holds the application logic for commission agreements.
package commission

import (
	"context"

	appertin "github.com/innotechlabs01/mr-training-api/internal/domain/audit"

	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"

	commissiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission"
)

// Service handles commission agreement business logic.
type Service struct {
	repo commissiondomain.Repository
}

// NewService creates a new commission service.
func NewService(repo commissiondomain.Repository) *Service {
	return &Service{repo: repo}
}

// CreateAgreementVersion registers a new commission-agreement version for a
// relationship, validating ownership and interval ordering. The new version
// supersedes the current open one; everything commits in one transaction with
// the audit event.
func (s *Service) CreateAgreementVersion(ctx context.Context, in commissiondomain.CreateAgreementInput, actorID string) (*commissiondomain.Agreement, error) {
	if in.RelationshipID == "" {
		return nil, apperrors.BadRequest("relationship ID is required")
	}
	if in.CoachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	if in.ValidFrom == "" {
		return nil, apperrors.BadRequest("valid_from is required")
	}
	if in.RateBps < 0 || in.RateBps > 100000 {
		return nil, apperrors.BadRequest("rate_bps must be between 0 and 100000 (0.00% - 1000.00%)")
	}
	if in.FixedAmountCents < 0 {
		return nil, apperrors.BadRequest("fixed_amount_cents must be non-negative")
	}

	ev := appertin.NewEvent("commission_agreement", "commission_agreement.created", actorID, map[string]any{
		"relationship_id":   in.RelationshipID,
		"rate_bps":          in.RateBps,
		"fixed_amount_cents": in.FixedAmountCents,
		"currency":          in.Currency,
		"valid_from":        in.ValidFrom,
	})

	agreement, err := s.repo.CreateAgreementVersion(ctx, in, ev)
	if err != nil {
		return nil, err
	}
	return agreement, nil
}

// ListByRelationship returns every agreement version for a relationship.
func (s *Service) ListByRelationship(ctx context.Context, relationshipID string) ([]*commissiondomain.Agreement, error) {
	if relationshipID == "" {
		return nil, apperrors.BadRequest("relationship ID is required")
	}
	return s.repo.ListByRelationship(ctx, relationshipID)
}

// GetOpenAgreement returns the current open agreement for a relationship.
func (s *Service) GetOpenAgreement(ctx context.Context, relationshipID string) (*commissiondomain.Agreement, error) {
	if relationshipID == "" {
		return nil, apperrors.BadRequest("relationship ID is required")
	}
	return s.repo.GetOpenAgreement(ctx, relationshipID)
}
