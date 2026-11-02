package ally_payment_declaration

import (
	"context"

	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_payment_declaration"
)

// Service handles payment declaration business logic.
type Service struct {
	repo domain.Repository
}

// NewService creates a new payment declaration service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// CreatePaymentDeclaration crea una declaración de pago para una operación.
// El aliado declara haber recibido el pago directo; MR Training no lo valida.
func (s *Service) CreatePaymentDeclaration(ctx context.Context, userID string, in domain.CreatePaymentDeclarationInput) (*domain.AllyPaymentDeclaration, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	if in.OperationID == "" {
		return nil, apperrors.BadRequest("operation ID is required")
	}
	if in.AmountCents < 0 {
		return nil, apperrors.BadRequest("amount_cents must be non-negative")
	}

	return s.repo.CreatePaymentDeclaration(ctx, in, userID)
}

// GetPaymentDeclaration devuelve una declaración por ID.
func (s *Service) GetPaymentDeclaration(ctx context.Context, userID, declarationID string) (*domain.AllyPaymentDeclaration, error) {
	if userID == "" || declarationID == "" {
		return nil, apperrors.BadRequest("user ID and declaration ID are required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetPaymentDeclaration(ctx, declarationID, allyID)
}

// ListPaymentDeclarationsByAlly devuelve todas las declaraciones de un aliado.
func (s *Service) ListPaymentDeclarationsByAlly(ctx context.Context, userID string) ([]*domain.AllyPaymentDeclaration, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListPaymentDeclarationsByAlly(ctx, allyID)
}

// ReviewPaymentDeclaration transiciona el estado (confirmed|rejected).
// Solo coach o admin pueden revisar; requiere acción explícita.
func (s *Service) ReviewPaymentDeclaration(ctx context.Context, declarationID, reviewerID string, in domain.ReviewPaymentDeclarationInput) (*domain.AllyPaymentDeclaration, error) {
	if declarationID == "" {
		return nil, apperrors.BadRequest("declaration ID is required")
	}
	if reviewerID == "" {
		return nil, apperrors.BadRequest("reviewer ID is required")
	}
	if in.Status != "confirmed" && in.Status != "rejected" {
		return nil, apperrors.BadRequest("status must be 'confirmed' or 'rejected'")
	}

	return s.repo.ReviewPaymentDeclaration(ctx, declarationID, reviewerID, in)
}

// ReversePaymentDeclaration revierte una declaración (crea nueva versión).
func (s *Service) ReversePaymentDeclaration(ctx context.Context, userID, declarationID string) (*domain.AllyPaymentDeclaration, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	if declarationID == "" {
		return nil, apperrors.BadRequest("declaration ID is required")
	}

	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.repo.ReversePaymentDeclaration(ctx, declarationID, allyID)
}
