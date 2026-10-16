package commission_entry

// CommissionEntry es una entrada de comisión calculada para una operación.
// Snapshot inmutable de los valores de cálculo.
type CommissionEntry struct {
	ID                 string `json:"id"`
	OperationID        string `json:"operation_id"`
	RelationshipID     string `json:"relationship_id"`
	CoachID            string `json:"coach_id"`
	AgreementID        string `json:"agreement_id"`
	AgreementVersion   int    `json:"agreement_version"`
	BaseCents          int64  `json:"base_cents"`
	RateBps            int64  `json:"rate_bps"`
	FixedAmountCents   int64  `json:"fixed_amount_cents"`
	AmountCents        int64  `json:"amount_cents"`
	Currency           string `json:"currency"`
	Status             string `json:"status"`     // accrued|reversed
	ComputedAt         string `json:"computed_at"`
	CreatedAt          string `json:"created_at"`
}

// CreateCommissionEntryInput es el payload para crear una entrada de comisión.
type CreateCommissionEntryInput struct {
	OperationID        string
	RelationshipID     string
	CoachID            string
	AgreementID        string
	AgreementVersion   int
	BaseCents          int64
	RateBps            int64
	FixedAmountCents   int64
	AmountCents        int64
	Currency           string
	ComputedAt         string
}

// FinancialAdjustment es un asiento compensatorio (refund/chargeback/correction).
type FinancialAdjustment struct {
	ID           string `json:"id"`
	EntryID      string `json:"entry_id,omitempty"`
	SettlementID string `json:"settlement_id,omitempty"`
	Kind         string `json:"kind"`            // refund|chargeback|correction
	AmountCents  int64  `json:"amount_cents"`    // signo negativo = reverso
	Reason       string `json:"reason"`
	CreatedBy    string `json:"created_by"`
	CreatedAt    string `json:"created_at"`
}

// CreateFinancialAdjustmentInput es el payload para crear un ajuste.
type CreateFinancialAdjustmentInput struct {
	EntryID      string
	SettlementID string
	Kind         string
	AmountCents  int64
	Reason       string
	CreatedBy    string
}

// ErrNotFound se devuelve cuando el registro no es visible para el caller.
var ErrNotFound = commissionError("commission entry not found")

type commissionError string

func (e commissionError) Error() string { return string(e) }
func (e commissionError) Is(target error) bool { return target == ErrNotFound }
