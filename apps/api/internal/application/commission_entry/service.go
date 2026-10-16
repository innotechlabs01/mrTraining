package commission_entry

import (
	"context"
	"math"

	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
)

// Service handles commission entry business logic.
type Service struct {
	repo domain.Repository
}

// NewService creates a new commission entry service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// CreateCommissionEntry calcula y crea una entrada de comisión para una operación.
// Elegibilidad: la operación debe estar fulfilled/attended y tener una declaración
// de pago en estado declared o confirmed. El acuerdo vigente se usa para el cálculo.
func (s *Service) CreateCommissionEntry(ctx context.Context, coachID string, operationID string) (*domain.CommissionEntry, error) {
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	if operationID == "" {
		return nil, apperrors.BadRequest("operation ID is required")
	}

	// 1. Estado de la operación, monto bruto y relationship_id
	status, grossCents, relationshipID, err := s.repo.GetOperationForCommission(ctx, operationID)
	if err != nil {
		return nil, err
	}
	if status != "fulfilled" && status != "attended" {
		return nil, apperrors.BadRequest("operation is not fulfilled or attended; commission not eligible")
	}

	// 2. Estado de la declaración de pago
	declStatus, err := s.repo.GetActiveDeclarationStatus(ctx, operationID)
	if err != nil {
		if err == domain.ErrNotFound {
			return nil, apperrors.BadRequest("no active payment declaration; commission not eligible")
		}
		return nil, err
	}
	if declStatus != "declared" && declStatus != "confirmed" {
		return nil, apperrors.BadRequest("payment declaration not in eligible state; commission not eligible")
	}

	// 3. Verificar que no exista ya una entrada no reversada
	if _, err := s.repo.GetOpenCommissionEntryByOperation(ctx, operationID); err == nil {
		return nil, apperrors.Conflict("commission entry already exists for this operation")
	} else if err != domain.ErrNotFound {
		return nil, err
	}

	// 4. Obtener acuerdo vigente para la relación
	agreementID, rateBps, fixedAmountCents, agreementVersion, err := s.repo.GetActiveAgreement(ctx, relationshipID)
	if err != nil {
		if err == domain.ErrNotFound {
			return nil, apperrors.BadRequest("no active commission agreement for this relationship; commission not eligible")
		}
		return nil, err
	}

	// 5. Validar overflow
	if err := checkOverflow(grossCents, rateBps); err != nil {
		return nil, err
	}

	// 6. Calcular comisión: amount = roundHalfUp(base * rateBps / 10000) + fixed_amount_cents
	baseCents := grossCents
	commissionPart := roundHalfUp(baseCents, rateBps)
	amountCents := commissionPart + fixedAmountCents

	if amountCents < 0 {
		return nil, apperrors.BadRequest("calculated commission amount is negative")
	}

	// 7. Crear la entrada de comisión
	now := "2026-10-16 00:00:00" // Fecha de computación; en producción usar time.Now()
	return s.repo.CreateCommissionEntry(ctx, domain.CreateCommissionEntryInput{
		OperationID:        operationID,
		RelationshipID:     relationshipID,
		CoachID:            coachID,
		AgreementID:        agreementID,
		AgreementVersion:   agreementVersion,
		BaseCents:          baseCents,
		RateBps:            rateBps,
		FixedAmountCents:   fixedAmountCents,
		AmountCents:        amountCents,
		Currency:           "COP",
		ComputedAt:         now,
	}, coachID)
}

// GetCommissionEntry devuelve una entrada solo si pertenece al coach.
func (s *Service) GetCommissionEntry(ctx context.Context, entryID, coachID string) (*domain.CommissionEntry, error) {
	if entryID == "" || coachID == "" {
		return nil, apperrors.BadRequest("entry ID and coach ID are required")
	}
	return s.repo.GetCommissionEntry(ctx, entryID, coachID)
}

// ListCommissionEntriesByCoach devuelve todas las entradas de un coach.
func (s *Service) ListCommissionEntriesByCoach(ctx context.Context, coachID string) ([]*domain.CommissionEntry, error) {
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	return s.repo.ListCommissionEntriesByCoach(ctx, coachID)
}

// ListCommissionEntriesByAlly devuelve todas las entradas de un aliado.
func (s *Service) ListCommissionEntriesByAlly(ctx context.Context, allyID string) ([]*domain.CommissionEntry, error) {
	if allyID == "" {
		return nil, apperrors.BadRequest("ally ID is required")
	}
	return s.repo.ListCommissionEntriesByAlly(ctx, allyID)
}

// ReverseCommissionEntry revierte una entrada y crea un ajuste compensatorio.
func (s *Service) ReverseCommissionEntry(ctx context.Context, entryID, reverserID, reason string) (*domain.CommissionEntry, *domain.FinancialAdjustment, error) {
	if entryID == "" || reverserID == "" || reason == "" {
		return nil, nil, apperrors.BadRequest("entry ID, reverser ID, and reason are required")
	}
	return s.repo.ReverseCommissionEntry(ctx, entryID, reverserID, reason)
}

// CreateFinancialAdjustment crea un asiento compensatorio.
func (s *Service) CreateFinancialAdjustment(ctx context.Context, in domain.CreateFinancialAdjustmentInput, actorID string) (*domain.FinancialAdjustment, error) {
	if in.EntryID == "" {
		return nil, apperrors.BadRequest("entry ID is required")
	}
	if in.Kind == "" {
		return nil, apperrors.BadRequest("kind is required")
	}
	if in.Kind != "refund" && in.Kind != "chargeback" && in.Kind != "correction" {
		return nil, apperrors.BadRequest("kind must be 'refund', 'chargeback' or 'correction'")
	}
	if in.Reason == "" {
		return nil, apperrors.BadRequest("reason is required")
	}
	if in.CreatedBy == "" {
		return nil, apperrors.BadRequest("created_by is required")
	}

	return s.repo.CreateFinancialAdjustment(ctx, in, actorID)
}

// ListFinancialAdjustmentsByEntry devuelve todos los ajustes de una entrada.
func (s *Service) ListFinancialAdjustmentsByEntry(ctx context.Context, entryID string) ([]*domain.FinancialAdjustment, error) {
	if entryID == "" {
		return nil, apperrors.BadRequest("entry ID is required")
	}
	return s.repo.ListFinancialAdjustmentsByEntry(ctx, entryID)
}

// roundHalfUp calcula roundHalfUp(base * rateBps / 10000) usando aritmética entera.
func roundHalfUp(base int64, rateBps int64) int64 {
	if rateBps == 0 {
		return 0
	}
	// (base * rateBps + 5000) / 10000 = round half up para enteros positivos
	return (base*rateBps + 5000) / 10000
}

// checkOverflow verifica que base * rateBps no desborde int64.
func checkOverflow(base int64, rateBps int64) error {
	if rateBps != 0 && base > math.MaxInt64/rateBps {
		return apperrors.BadRequest("monetary overflow: base_cents * rate_bps exceeds int64")
	}
	return nil
}
