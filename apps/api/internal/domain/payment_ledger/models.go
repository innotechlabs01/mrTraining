package paymentledger

import (
	"context"
	"errors"
)

const (
	StatusPending  = "pending"
	StatusApproved = "approved"
	StatusHeld     = "held"
	StatusPayable  = "payable"
	StatusSettled  = "settled"
	StatusReversed = "reversed"
)

const (
	SourceTypeMembership = "membership_payment"
	SourceTypeStoreOrder = "store_order"
)

const (
	AdjustmentRefund     = "refund"
	AdjustmentChargeback  = "chargeback"
	AdjustmentCorrection = "correction"
)

type CommissionTerm struct {
	ID            string
	CoachID       string
	Version       int
	RateBps       int64
	FixedFeeCents int64
	ProcessingBps int64
	Currency      string
	Status        string
	ValidFrom     string
	ValidTo       *string
	CreatedAt     string
}

type LedgerEntry struct {
	ID                      string
	WompiTransactionID      string
	SourceType              string
	MembershipPaymentID     string
	OrderID                 string
	SubscriptionID          string
	AthleteID               string
	CoachID                 string
	GrossAmountCents        int64
	ProcessingFeeCents      int64
	PlatformCommissionCents int64
	CoachNetPayableCents    int64
	AdjustmentsCents        int64
	Currency                string
	PeriodStart             string
	PeriodEnd               string
	PaymentPeriod           string
	Status                  string
	CommissionTermID        string
	CommissionTermVersion   int
	ReversedEntryID         string
	SettlementReference     string
	SettledAt               string
	IdempotencyKey          string
	CreatedAt               string
	UpdatedAt               string
}

type CreateLedgerEntryInput struct {
	WompiTransactionID      string
	SourceType              string
	MembershipPaymentID     string
	OrderID                 string
	SubscriptionID          string
	AthleteID               string
	CoachID                 string
	GrossAmountCents        int64
	ProcessingFeeCents      int64
	PlatformCommissionCents int64
	Currency                string
	PeriodStart             string
	PeriodEnd               string
	PaymentPeriod           string
	Status                  string
	CommissionTermID        string
	IdempotencyKey          string
}

type AdjustmentInput struct {
	EntryID           string
	Kind              string
	AmountCents       int64
	Reason            string
	CreatedBy         string
	ExternalReference string
}

type FinancialAdjustment struct {
	ID               string
	EntryID          string
	Kind             string
	AmountCents      int64
	Reason           string
	CreatedBy        string
	ExternalReference string
	CreatedAt        string
}

type Repository interface {
	CreateTerm(ctx context.Context, term *CommissionTerm) (*CommissionTerm, error)
	GetActiveTerm(ctx context.Context, coachID string, at string) (*CommissionTerm, error)
	CreateEntry(ctx context.Context, entry *LedgerEntry) (*LedgerEntry, error)
	GetEntryByWompiID(ctx context.Context, wompiTxID string) (*LedgerEntry, error)
	GetEntry(ctx context.Context, id, coachID string) (*LedgerEntry, error)
	ListEntriesByCoach(ctx context.Context, coachID string) ([]*LedgerEntry, error)
	UpdateEntryStatus(ctx context.Context, id, coachID, status string) error
	UpdateEntryAmounts(ctx context.Context, entry *LedgerEntry) error
	SettleEntry(ctx context.Context, id, coachID, settlementReference, settledAt string) error
	RecordAdjustment(ctx context.Context, adj *FinancialAdjustment) (*FinancialAdjustment, error)
	ListAdjustments(ctx context.Context, entryID string) ([]*FinancialAdjustment, error)
}

var ErrNotFound = errors.New("payment ledger entry not found")
var ErrDuplicate = errors.New("duplicate wompi transaction")
