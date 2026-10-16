package commission_entry

import (
	"context"
)

// Repository define persistencia para entradas de comisión y ajustes.
type Repository interface {
	// CreateCommissionEntry crea una entrada de comisión.
	CreateCommissionEntry(ctx context.Context, in CreateCommissionEntryInput, actorID string) (*CommissionEntry, error)

	// GetCommissionEntry devuelve una entrada solo si pertenece al coach.
	GetCommissionEntry(ctx context.Context, entryID, coachID string) (*CommissionEntry, error)

	// ListCommissionEntriesByCoach devuelve todas las entradas de un coach.
	ListCommissionEntriesByCoach(ctx context.Context, coachID string) ([]*CommissionEntry, error)

	// ListCommissionEntriesByAlly devuelve todas las entradas de un aliado
	// (vía sus relaciones).
	ListCommissionEntriesByAlly(ctx context.Context, allyID string) ([]*CommissionEntry, error)

	// GetOpenCommissionEntryByOperation devuelve la entrada no reversada de una
	// operación, o ErrNotFound.
	GetOpenCommissionEntryByOperation(ctx context.Context, operationID string) (*CommissionEntry, error)

	// GetOperationForCommission devuelve el estado, monto bruto y relationship_id de una operación.
	GetOperationForCommission(ctx context.Context, operationID string) (status string, grossCents int64, relationshipID string, err error)

	// GetActiveDeclarationStatus devuelve el estado de la declaración activa de una operación.
	GetActiveDeclarationStatus(ctx context.Context, operationID string) (string, error)

	// GetActiveAgreement devuelve el acuerdo vigente para una relación.
	GetActiveAgreement(ctx context.Context, relationshipID string) (agreementID string, rateBps int64, fixedAmountCents int64, version int, err error)

	// ReverseCommissionEntry revierte una entrada (status=reversed) y crea un
	// ajuste compensatorio.
	ReverseCommissionEntry(ctx context.Context, entryID, reverserID, reason string) (*CommissionEntry, *FinancialAdjustment, error)

	// CreateFinancialAdjustment crea un asiento compensatorio.
	CreateFinancialAdjustment(ctx context.Context, in CreateFinancialAdjustmentInput, actorID string) (*FinancialAdjustment, error)

	// ListFinancialAdjustmentsByEntry devuelve todos los ajustes de una entrada.
	ListFinancialAdjustmentsByEntry(ctx context.Context, entryID string) ([]*FinancialAdjustment, error)
}