package dto

// CoachSettlementResponse is the public view of a settlement.
type CoachSettlementResponse struct {
	ID                 string `json:"id"`
	CoachID            string `json:"coach_id"`
	AllyID             string `json:"ally_id"`
	PeriodStart        string `json:"period_start"`
	PeriodEnd          string `json:"period_end"`
	PeriodKey          string `json:"period_key"`
	Currency           string `json:"currency"`
	Status             string `json:"status"`
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

// CreateSettlementRequest is the payload to create a draft settlement.
type CreateSettlementRequest struct {
	CoachID    string `json:"coach_id"`
	AllyID     string `json:"ally_id"`
	PeriodStart string `json:"period_start"`
	PeriodEnd   string `json:"period_end"`
	PeriodKey   string `json:"period_key"`
	Currency    string `json:"currency"`
}

// UpdateSettlementStatusRequest is the payload to transition settlement status.
type UpdateSettlementStatusRequest struct {
	Status string `json:"status"` // draft|calculated|under_review|approved|document_issued|paid_external|disputed|void
	Note   string `json:"note,omitempty"`
}

// VoidSettlementRequest is the payload to void a settlement.
type VoidSettlementRequest struct {
	Reason string `json:"reason"`
}

// SettlementItemResponse is the public view of a settlement item.
type SettlementItemResponse struct {
	ID           string `json:"id"`
	SettlementID string `json:"settlement_id"`
	EntryID      string `json:"entry_id"`
	BaseCents    int64  `json:"base_cents"`
	RateBps      int64  `json:"rate_bps"`
	AmountCents  int64  `json:"amount_cents"`
	ReleasedAt   string `json:"released_at,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// SettlementDocumentResponse is the public view of a settlement document.
type SettlementDocumentResponse struct {
	ID           string `json:"id"`
	SettlementID string `json:"settlement_id"`
	Kind         string `json:"kind"`
	ContentRef   string `json:"content_ref,omitempty"`
	Status       string `json:"status"`
	Version      int    `json:"version"`
	GeneratedAt  string `json:"generated_at"`
	SentAt       string `json:"sent_at,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// CreateSettlementDocumentRequest is the payload to create a settlement document.
type CreateSettlementDocumentRequest struct {
	SettlementID string `json:"settlement_id"`
	Kind         string `json:"kind"`
	ContentRef   string `json:"content_ref"`
}

// CoachPaymentRecordResponse is the public view of an external payment record.
type CoachPaymentRecordResponse struct {
	ID          string `json:"id"`
	SettlementID string `json:"settlement_id"`
	CoachID     string `json:"coach_id"`
	PayerAllyID string `json:"payer_ally_id"`
	AmountCents int64  `json:"amount_cents"`
	Currency    string `json:"currency"`
	ActorID     string `json:"actor_id"`
	ActorType   string `json:"actor_type"`
	Reference   string `json:"reference,omitempty"`
	EvidenceRef string `json:"evidence_ref,omitempty"`
	DeclaredAt  string `json:"declared_at"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
}

// CreateCoachPaymentRecordRequest is the payload to create an external payment record.
type CreateCoachPaymentRecordRequest struct {
	SettlementID string `json:"settlement_id"`
	CoachID      string `json:"coach_id"`
	PayerAllyID  string `json:"payer_ally_id"`
	AmountCents  int64  `json:"amount_cents"`
	Currency     string `json:"currency"`
	ActorID      string `json:"actor_id"`
	ActorType    string `json:"actor_type"`
	Reference    string `json:"reference,omitempty"`
	EvidenceRef  string `json:"evidence_ref,omitempty"`
	DeclaredAt   string `json:"declared_at"`
}

// ConfirmCoachPaymentRecordRequest is the payload to confirm an external payment record.
type ConfirmCoachPaymentRecordRequest struct {
	ActorID string `json:"actor_id"`
}

// SettlementItemCandidateResponse is a commission entry candidate for settlement.
type SettlementItemCandidateResponse struct {
	EntryID         string `json:"entry_id"`
	OperationID     string `json:"operation_id"`
	RelationshipID  string `json:"relationship_id"`
	BaseCents       int64  `json:"base_cents"`
	RateBps         int64  `json:"rate_bps"`
	FixedAmountCents int64 `json:"fixed_amount_cents"`
	AmountCents     int64  `json:"amount_cents"`
	Currency        string `json:"currency"`
	ComputedAt      string `json:"computed_at"`
}
