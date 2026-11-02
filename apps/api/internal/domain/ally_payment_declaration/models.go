package ally_payment_declaration

// AllyPaymentDeclaration es una declaración de pago directo recibido por el
// aliado. MR Training no valida el pago contra ningún banco/pasarela; la
// declaración es solo una declaración del aliado. Append-only: correcciones
// crean nueva versión (supersedes_id), nunca se modifica ni borra.
type AllyPaymentDeclaration struct {
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
	Status       string `json:"status"`          // declared|under_review|confirmed|rejected|reversed
	ReviewedBy   string `json:"reviewed_by,omitempty"`
	ReviewedAt   string `json:"reviewed_at,omitempty"`
	ReviewNote   string `json:"review_note,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// CreatePaymentDeclarationInput es el payload para crear una declaración.
type CreatePaymentDeclarationInput struct {
	OperationID  string
	AmountCents  int64
	Currency     string
	Method       string
	DeclaredAt   string
	Reference    string
	EvidenceRef  string
}

// ReviewPaymentDeclarationInput es el payload para revisar (confirmar/rechazar).
type ReviewPaymentDeclarationInput struct {
	Status     string // confirmed | rejected
	ReviewedBy string
	ReviewNote string
}

// ErrNotFound se devuelve cuando la declaración no es visible para el caller.
var ErrNotFound = paymentsError("payment declaration not found")

type paymentsError string

func (e paymentsError) Error() string { return string(e) }
func (e paymentsError) Is(target error) bool { return target == ErrNotFound }
