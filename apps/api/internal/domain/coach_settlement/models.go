// Package coach_settlement models monthly settlements, settlement items,
// settlement documents and external coach payments (pagos directos aliado→coach).
//
// Identifiers, tables and columns are English on purpose; business wording stays
// Spanish in UI. Money is stored as INTEGER cents (`_cents`); no float.
package coach_settlement

// CoachSettlement is a monthly settlement grouped by coach (beneficiary) +
// ally (payer) + period + currency. MVP currency is COP only.
type CoachSettlement struct {
	ID                 string `json:"id"`
	CoachID            string `json:"coach_id"`
	AllyID             string `json:"ally_id"`
	PeriodStart        string `json:"period_start"`
	PeriodEnd          string `json:"period_end"`
	PeriodKey          string `json:"period_key"`
	Currency           string `json:"currency"`
	Status             string `json:"status"` // draft|calculated|under_review|approved|document_issued|paid_external|disputed|void
	OperationsCount    int    `json:"operations_count"`
	BaseTotalCents     int64  `json:"base_total_cents"`
	CommissionGrossCents int64 `json:"commission_gross_cents"`
	AdjustmentsCents   int64  `json:"adjustments_cents"`
	CommissionNetCents int64  `json:"commission_net_cents"`
	CalculatedAt       string `json:"calculated_at,omitempty"`
	ApprovedAt         string `json:"approved_at,omitempty"`
	ClosedAt           string `json:"closed_at,omitempty"`
	CreatedAt          string `json:"created_at"`
	UpdatedAt          string `json:"updated_at"`
}

// SettlementItem links one commission entry to a settlement.
type SettlementItem struct {
	ID           string `json:"id"`
	SettlementID string `json:"settlement_id"`
	EntryID      string `json:"entry_id"`
	BaseCents    int64  `json:"base_cents"`
	RateBps      int64  `json:"rate_bps"`
	AmountCents  int64  `json:"amount_cents"`
	ReleasedAt   string `json:"released_at,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// SettlementDocument is a downloadable draft report (CSV/markdown).
type SettlementDocument struct {
	ID           string `json:"id"`
	SettlementID string `json:"settlement_id"`
	Kind         string `json:"kind"` // draft_account_of_collection
	ContentRef   string `json:"content_ref,omitempty"`
	Status       string `json:"status"` // draft|reviewed|approved
	Version      int    `json:"version"`
	GeneratedAt  string `json:"generated_at"`
	SentAt       string `json:"sent_at,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// CoachPaymentRecord is an external direct payment ally→coach (H-09).
type CoachPaymentRecord struct {
	ID          string `json:"id"`
	SettlementID string `json:"settlement_id"`
	CoachID     string `json:"coach_id"`
	PayerAllyID string `json:"payer_ally_id"`
	AmountCents int64  `json:"amount_cents"`
	Currency    string `json:"currency"`
	ActorID     string `json:"actor_id"`
	ActorType   string `json:"actor_type"` // user|system
	Reference   string `json:"reference,omitempty"`
	EvidenceRef string `json:"evidence_ref,omitempty"`
	DeclaredAt  string `json:"declared_at"`
	Status      string `json:"status"` // declared|confirmed
	CreatedAt   string `json:"created_at"`
}

// CreateSettlementInput is the payload to create a draft settlement.
type CreateSettlementInput struct {
	CoachID    string
	AllyID     string
	PeriodStart string
	PeriodEnd   string
	PeriodKey   string
	Currency    string
}

// CalculateSettlementInput is the payload to calculate a settlement from
// eligible commission entries.
type CalculateSettlementInput struct {
	SettlementID string
}

// UpdateSettlementStatusInput transitions settlement status.
type UpdateSettlementStatusInput struct {
	Status string
}

// VoidSettlementInput voids a draft|calculated|under_review settlement.
type VoidSettlementInput struct {
	ActorID string
	Reason  string
}

// CreateSettlementDocumentInput creates a settlement document.
type CreateSettlementDocumentInput struct {
	SettlementID string
	Kind         string
	ContentRef   string
}

// CreateCoachPaymentRecordInput creates an external payment record.
type CreateCoachPaymentRecordInput struct {
	SettlementID string
	CoachID      string
	PayerAllyID  string
	AmountCents  int64
	Currency     string
	ActorID      string
	ActorType    string
	Reference    string
	EvidenceRef  string
	DeclaredAt   string
}

// ConfirmCoachPaymentRecordInput confirms an external payment.
type ConfirmCoachPaymentRecordInput struct {
	ActorID string
}

// ErrNotFound is returned when a settlement or related record is not visible.
var ErrNotFound = settlementError("settlement record not found")

type settlementError string

func (e settlementError) Error() string { return string(e) }
func (e settlementError) Is(target error) bool { return target == ErrNotFound }

// Valid statuses.
const (
	StatusDraft           = "draft"
	StatusCalculated      = "calculated"
	StatusUnderReview     = "under_review"
	StatusApproved        = "approved"
	StatusDocumentIssued  = "document_issued"
	StatusPaidExternal    = "paid_external"
	StatusDisputed        = "disputed"
	StatusVoid            = "void"
)

// Valid document statuses.
const (
	DocStatusDraft     = "draft"
	DocStatusReviewed  = "reviewed"
	DocStatusApproved  = "approved"
)

// Valid payment record statuses.
const (
	PaymentStatusDeclared = "declared"
	PaymentStatusConfirmed = "confirmed"
)

// Valid payment record actor types.
const (
	ActorTypeUser  = "user"
	ActorTypeSystem = "system"
)

// EditableUntilUnderReview reports whether a settlement in the given status can
// still be edited (items, totals, etc.).
func EditableUntilUnderReview(status string) bool {
	switch status {
	case StatusDraft, StatusCalculated, StatusUnderReview:
		return true
	default:
		return false
	}
}

// CanVoid reports whether a settlement can be voided from the given status.
func CanVoid(status string) bool {
	switch status {
	case StatusDraft, StatusCalculated, StatusUnderReview:
		return true
	default:
		return false
	}
}

// CanTransition reports whether status → nextStatus is a valid liquidation
// transition (H-10 machine). Transitions not listed are rejected.
func CanTransition(current, next string) bool {
	switch current {
	case StatusDraft:
		return next == StatusCalculated || next == StatusVoid
	case StatusCalculated:
		return next == StatusUnderReview || next == StatusVoid
	case StatusUnderReview:
		return next == StatusApproved || next == StatusRejected || next == StatusVoid
	case StatusApproved:
		return next == StatusDocumentIssued || next == StatusPaidExternal || next == StatusDisputed
	case StatusDocumentIssued:
		return next == StatusPaidExternal || next == StatusDisputed
	case StatusPaidExternal:
		return next == StatusDisputed
	case StatusDisputed:
		return false
	case StatusVoid:
		return false
	default:
		return false
	}
}

// StatusRejected is a settlement status used when under_review is rejected.
const StatusRejected = "rejected"
