package coach_settlement

import (
	"context"
)

// Repository defines persistence for the coach settlement domain.
// All financial mutations are written in the same transaction as their audit
// event (H-05).
type Repository interface {
	// GetSettlement returns a settlement only when visible to the caller.
	GetSettlement(ctx context.Context, settlementID, coachID string) (*CoachSettlement, error)

	// ListSettlementsByCoach lists settlements where the coach is the beneficiary.
	ListSettlementsByCoach(ctx context.Context, coachID string) ([]*CoachSettlement, error)

	// ListSettlementsByAlly lists settlements where the ally is the contractual payer.
	ListSettlementsByAlly(ctx context.Context, allyID string) ([]*CoachSettlement, error)

	// ListSettlementsForAdmin lists all settlements (admin view).
	ListSettlementsForAdmin(ctx context.Context) ([]*CoachSettlement, error)

	// CreateSettlement creates a draft settlement.
	CreateSettlement(ctx context.Context, in CreateSettlementInput, actorID string) (*CoachSettlement, error)

	// CalculateSettlement computes totals from eligible commission entries
	// (fulfilled/attended operations with eligible payment declaration) and
	// creates settlement items. Marks settlement as calculated.
	CalculateSettlement(ctx context.Context, settlementID string, actorID string) (*CoachSettlement, []*SettlementItem, error)

	// UpdateSettlementStatus transitions settlement status with audit.
	UpdateSettlementStatus(ctx context.Context, settlementID, actorID string, status string, note string) (*CoachSettlement, error)

	// VoidSettlement voids a draft|calculated|under_review settlement and
	// releases its settlement items for re-settlement.
	VoidSettlement(ctx context.Context, settlementID, actorID string, reason string) (*CoachSettlement, error)

	// ListSettlementItems lists items of a settlement.
	ListSettlementItems(ctx context.Context, settlementID string) ([]*SettlementItem, error)

	// CreateSettlementDocument creates a settlement document.
	CreateSettlementDocument(ctx context.Context, in CreateSettlementDocumentInput, actorID string) (*SettlementDocument, error)

	// ListSettlementDocuments lists documents of a settlement.
	ListSettlementDocuments(ctx context.Context, settlementID string) ([]*SettlementDocument, error)

	// CreateCoachPaymentRecord creates an external payment record.
	CreateCoachPaymentRecord(ctx context.Context, in CreateCoachPaymentRecordInput, actorID string) (*CoachPaymentRecord, error)

	// ConfirmCoachPaymentRecord confirms an external payment record.
	ConfirmCoachPaymentRecord(ctx context.Context, recordID, actorID string) (*CoachPaymentRecord, error)

	// ListCoachPaymentRecords lists payment records for a coach (beneficiary) or
	// ally (payer). If both are empty, lists all (admin).
	ListCoachPaymentRecords(ctx context.Context, coachID string, allyID string) ([]*CoachPaymentRecord, error)

	// GetEligibleEntriesForPeriod returns commission entries eligible for
	// settlement in the given period for the given coach+ally: entries whose
	// operation is fulfilled/attended and whose payment declaration is active
	// (declared/under_review/confirmed), excluding entries already in an
	// active settlement item.
	GetEligibleEntriesForPeriod(ctx context.Context, coachID, allyID, periodStart, periodEnd string) ([]*SettlementItemCandidate, error)
}

// SettlementItemCandidate is a commission entry candidate for settlement.
type SettlementItemCandidate struct {
	EntryID         string
	OperationID     string
	RelationshipID  string
	BaseCents       int64
	RateBps         int64
	FixedAmountCents int64
	AmountCents     int64
	Currency        string
	ComputedAt      string
}
