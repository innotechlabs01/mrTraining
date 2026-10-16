package coach_settlement

import (
	"context"

	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_settlement"
)

// Service handles coach settlement business logic.
type Service struct {
	repo domain.Repository
}

// NewService creates a new settlement service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// CreateSettlement creates a draft settlement for a coach+ally+period.
func (s *Service) CreateSettlement(ctx context.Context, in domain.CreateSettlementInput, actorID string) (*domain.CoachSettlement, error) {
	if in.CoachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	if in.AllyID == "" {
		return nil, apperrors.BadRequest("ally ID is required")
	}
	if in.PeriodKey == "" {
		return nil, apperrors.BadRequest("period key is required")
	}
	if in.Currency == "" {
		in.Currency = "COP"
	}
	if in.Currency != "COP" {
		return nil, apperrors.BadRequest("currency must be COP")
	}

	return s.repo.CreateSettlement(ctx, in, actorID)
}

// CalculateSettlement computes totals from eligible entries and creates settlement items.
func (s *Service) CalculateSettlement(ctx context.Context, settlementID, actorID string) (*domain.CoachSettlement, []*domain.SettlementItem, error) {
	if settlementID == "" {
		return nil, nil, apperrors.BadRequest("settlement ID is required")
	}
	if actorID == "" {
		return nil, nil, apperrors.BadRequest("actor ID is required")
	}

	return s.repo.CalculateSettlement(ctx, settlementID, actorID)
}

// GetSettlement returns a settlement only when visible to the caller.
func (s *Service) GetSettlement(ctx context.Context, settlementID, coachID string) (*domain.CoachSettlement, error) {
	if settlementID == "" {
		return nil, apperrors.BadRequest("settlement ID is required")
	}
	return s.repo.GetSettlement(ctx, settlementID, coachID)
}

// ListSettlementsByCoach lists settlements where the coach is the beneficiary.
func (s *Service) ListSettlementsByCoach(ctx context.Context, coachID string) ([]*domain.CoachSettlement, error) {
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	return s.repo.ListSettlementsByCoach(ctx, coachID)
}

// ListSettlementsByAlly lists settlements where the ally is the contractual payer.
func (s *Service) ListSettlementsByAlly(ctx context.Context, allyID string) ([]*domain.CoachSettlement, error) {
	if allyID == "" {
		return nil, apperrors.BadRequest("ally ID is required")
	}
	return s.repo.ListSettlementsByAlly(ctx, allyID)
}

// ListSettlementsForAdmin lists all settlements (admin view).
func (s *Service) ListSettlementsForAdmin(ctx context.Context) ([]*domain.CoachSettlement, error) {
	return s.repo.ListSettlementsForAdmin(ctx)
}

// UpdateSettlementStatus transitions settlement status with audit.
func (s *Service) UpdateSettlementStatus(ctx context.Context, settlementID, actorID string, status string, note string) (*domain.CoachSettlement, error) {
	if settlementID == "" {
		return nil, apperrors.BadRequest("settlement ID is required")
	}
	if actorID == "" {
		return nil, apperrors.BadRequest("actor ID is required")
	}
	if status == "" {
		return nil, apperrors.BadRequest("status is required")
	}

	return s.repo.UpdateSettlementStatus(ctx, settlementID, actorID, status, note)
}

// VoidSettlement voids a draft|calculated|under_review settlement and releases its items.
func (s *Service) VoidSettlement(ctx context.Context, settlementID, actorID string, reason string) (*domain.CoachSettlement, error) {
	if settlementID == "" {
		return nil, apperrors.BadRequest("settlement ID is required")
	}
	if actorID == "" {
		return nil, apperrors.BadRequest("actor ID is required")
	}
	if reason == "" {
		return nil, apperrors.BadRequest("reason is required")
	}

	return s.repo.VoidSettlement(ctx, settlementID, actorID, reason)
}

// ListSettlementItems lists items of a settlement.
func (s *Service) ListSettlementItems(ctx context.Context, settlementID string) ([]*domain.SettlementItem, error) {
	if settlementID == "" {
		return nil, apperrors.BadRequest("settlement ID is required")
	}
	return s.repo.ListSettlementItems(ctx, settlementID)
}

// CreateSettlementDocument creates a settlement document.
func (s *Service) CreateSettlementDocument(ctx context.Context, in domain.CreateSettlementDocumentInput, actorID string) (*domain.SettlementDocument, error) {
	if in.SettlementID == "" {
		return nil, apperrors.BadRequest("settlement ID is required")
	}
	if in.Kind == "" {
		return nil, apperrors.BadRequest("kind is required")
	}
	if in.ContentRef == "" {
		return nil, apperrors.BadRequest("content ref is required")
	}
	if actorID == "" {
		return nil, apperrors.BadRequest("actor ID is required")
	}

	return s.repo.CreateSettlementDocument(ctx, in, actorID)
}

// ListSettlementDocuments lists documents of a settlement.
func (s *Service) ListSettlementDocuments(ctx context.Context, settlementID string) ([]*domain.SettlementDocument, error) {
	if settlementID == "" {
		return nil, apperrors.BadRequest("settlement ID is required")
	}
	return s.repo.ListSettlementDocuments(ctx, settlementID)
}

// CreateCoachPaymentRecord creates an external payment record.
func (s *Service) CreateCoachPaymentRecord(ctx context.Context, in domain.CreateCoachPaymentRecordInput, actorID string) (*domain.CoachPaymentRecord, error) {
	if in.SettlementID == "" {
		return nil, apperrors.BadRequest("settlement ID is required")
	}
	if in.CoachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	if in.PayerAllyID == "" {
		return nil, apperrors.BadRequest("payer ally ID is required")
	}
	if in.AmountCents < 0 {
		return nil, apperrors.BadRequest("amount_cents must be non-negative")
	}
	if in.Currency == "" {
		in.Currency = "COP"
	}
	if in.Currency != "COP" {
		return nil, apperrors.BadRequest("currency must be COP")
	}
	if in.ActorID == "" {
		return nil, apperrors.BadRequest("actor ID is required")
	}
	if in.ActorType == "" {
		in.ActorType = domain.ActorTypeUser
	}
	if in.ActorType != domain.ActorTypeUser && in.ActorType != domain.ActorTypeSystem {
		return nil, apperrors.BadRequest("actor_type must be 'user' or 'system'")
	}
	if in.DeclaredAt == "" {
		return nil, apperrors.BadRequest("declared_at is required")
	}

	return s.repo.CreateCoachPaymentRecord(ctx, in, actorID)
}

// ConfirmCoachPaymentRecord confirms an external payment record.
func (s *Service) ConfirmCoachPaymentRecord(ctx context.Context, recordID, actorID string) (*domain.CoachPaymentRecord, error) {
	if recordID == "" {
		return nil, apperrors.BadRequest("record ID is required")
	}
	if actorID == "" {
		return nil, apperrors.BadRequest("actor ID is required")
	}

	return s.repo.ConfirmCoachPaymentRecord(ctx, recordID, actorID)
}

// ListCoachPaymentRecords lists payment records for a coach or ally.
func (s *Service) ListCoachPaymentRecords(ctx context.Context, coachID string, allyID string) ([]*domain.CoachPaymentRecord, error) {
	return s.repo.ListCoachPaymentRecords(ctx, coachID, allyID)
}

// GetEligibleEntriesForPeriod returns commission entries eligible for settlement.
func (s *Service) GetEligibleEntriesForPeriod(ctx context.Context, coachID, allyID, periodStart, periodEnd string) ([]*domain.SettlementItemCandidate, error) {
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	if allyID == "" {
		return nil, apperrors.BadRequest("ally ID is required")
	}

	return s.repo.GetEligibleEntriesForPeriod(ctx, coachID, allyID, periodStart, periodEnd)
}
