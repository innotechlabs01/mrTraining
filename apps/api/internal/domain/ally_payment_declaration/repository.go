package ally_payment_declaration

import (
	"context"
)

// Repository define persistencia para declaraciones de pago.
type Repository interface {
	// CreatePaymentDeclaration crea una declaración para una operación válida.
	CreatePaymentDeclaration(ctx context.Context, in CreatePaymentDeclarationInput, actorID string) (*AllyPaymentDeclaration, error)

	// GetPaymentDeclaration devuelve una declaración por ID y la所属 de un aliado.
	GetPaymentDeclaration(ctx context.Context, declarationID, allyID string) (*AllyPaymentDeclaration, error)

	// ResolveAllyID devuelve el aliado que el usuario posee o pertenece.
	ResolveAllyID(ctx context.Context, userID string) (string, error)

	// ListPaymentDeclarationsByAlly devuelve todas las declaraciones de un aliado.
	ListPaymentDeclarationsByAlly(ctx context.Context, allyID string) ([]*AllyPaymentDeclaration, error)

	// ListPaymentDeclarationsByOperation devuelve todas las versiones de una operación.
	ListPaymentDeclarationsByOperation(ctx context.Context, operationID string) ([]*AllyPaymentDeclaration, error)

	// GetActiveDeclarationByOperation devuelve la declaración activa (declared,
	// under_review o confirmed) de una operación, o ErrNotFound.
	GetActiveDeclarationByOperation(ctx context.Context, operationID string) (*AllyPaymentDeclaration, error)

	// ReviewPaymentDeclaration transiciona el estado (confirmed|rejected) con
	// auditoría del revisor. Solo coach o admin pueden revisar.
	ReviewPaymentDeclaration(ctx context.Context, declarationID, reviewerID string, in ReviewPaymentDeclarationInput) (*AllyPaymentDeclaration, error)

	// ReversePaymentDeclaration revierte la declaración (crea nueva versión).
	ReversePaymentDeclaration(ctx context.Context, declarationID, reverserAllyID string) (*AllyPaymentDeclaration, error)
}