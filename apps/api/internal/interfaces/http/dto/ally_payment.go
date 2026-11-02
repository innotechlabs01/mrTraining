package dto

// AllyPaymentDeclarationResponse es la vista pública de una declaración de pago.
type AllyPaymentDeclarationResponse struct {
	ID           string `json:"id"`
	OperationID  string `json:"operation_id"`
	Version      int    `json:"version"`
	SupersedesID string `json:"supersedes_id,omitempty"`
	AmountCents  int64  `json:"amount_cents"`
	Currency     string `json:"currency"`
	Method       string `json:"method,omitempty"`
	DeclaredAt   string `json:"declared_at"`
	Reference    string `json:"reference,omitempty"`
	EvidenceRef  string `json:"evidence_ref,omitempty"`
	Status       string `json:"status"`
	ReviewedBy   string `json:"reviewed_by,omitempty"`
	ReviewedAt   string `json:"reviewed_at,omitempty"`
	ReviewNote   string `json:"review_note,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// CreateAllyPaymentDeclarationRequest es el payload para declarar un pago.
type CreateAllyPaymentDeclarationRequest struct {
	OperationID  string `json:"operation_id"`
	AmountCents  int64  `json:"amount_cents"`
	Currency     string `json:"currency"`
	Method       string `json:"method,omitempty"`
	DeclaredAt   string `json:"declared_at,omitempty"`
	Reference    string `json:"reference,omitempty"`
	EvidenceRef  string `json:"evidence_ref,omitempty"`
}

// ReviewAllyPaymentDeclarationRequest es el payload para revisar (confirmar/rechazar).
type ReviewAllyPaymentDeclarationRequest struct {
	Status     string `json:"status"`     // confirmed | rejected
	ReviewNote string `json:"review_note,omitempty"`
}

// ReverseAllyPaymentDeclarationRequest es el payload para reversar.
type ReverseAllyPaymentDeclarationRequest struct {
	Reason string `json:"reason,omitempty"`
}

// CommissionEntryResponse es la vista pública de una entrada de comisión.
type CommissionEntryResponse struct {
	ID                string `json:"id"`
	OperationID       string `json:"operation_id"`
	RelationshipID    string `json:"relationship_id"`
	CoachID           string `json:"coach_id"`
	AgreementID       string `json:"agreement_id"`
	AgreementVersion  int    `json:"agreement_version"`
	BaseCents         int64  `json:"base_cents"`
	RateBps           int64  `json:"rate_bps"`
	FixedAmountCents  int64  `json:"fixed_amount_cents"`
	AmountCents       int64  `json:"amount_cents"`
	Currency          string `json:"currency"`
	Status            string `json:"status"`
	ComputedAt        string `json:"computed_at"`
	CreatedAt         string `json:"created_at"`
}

// FinancialAdjustmentResponse es la vista pública de un ajuste compensatorio.
type FinancialAdjustmentResponse struct {
	ID          string `json:"id"`
	EntryID     string `json:"entry_id,omitempty"`
	SettlementID string `json:"settlement_id,omitempty"`
	Kind        string `json:"kind"`
	AmountCents int64  `json:"amount_cents"`
	Reason      string `json:"reason"`
	CreatedBy   string `json:"created_by"`
	CreatedAt   string `json:"created_at"`
}

// ReverseCommissionEntryRequest es el payload para reversar una comisión.
type ReverseCommissionEntryRequest struct {
	Reason string `json:"reason"`
}

// CreateFinancialAdjustmentRequest es el payload para crear un ajuste.
type CreateFinancialAdjustmentRequest struct {
	EntryID      string `json:"entry_id"`
	SettlementID string `json:"settlement_id,omitempty"`
	Kind         string `json:"kind"`          // refund|chargeback|correction
	AmountCents  int64  `json:"amount_cents"`
	Reason       string `json:"reason"`
}

// CreateCommissionEntryRequest es el payload para calcular y crear una comisión.
type CreateCommissionEntryRequest struct {
	OperationID string `json:"operation_id"`
}
