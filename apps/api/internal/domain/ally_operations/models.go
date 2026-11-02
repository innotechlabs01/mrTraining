package ally_operations

// AllyOperation es el agregado raíz de una operación de comercio (orden o reserva).
type AllyOperation struct {
	ID            string `json:"id"`
	Kind          string `json:"kind"`              // order | reservation
	RelationshipID string `json:"relationship_id"`   // R7: fijado al crear, FK a coach_ally_relationships
	AllyID        string `json:"ally_id"`           // aliado dueño
	AthleteID     string `json:"athlete_id"`        // usuario comprador/atleta
	Status        string `json:"status"`            // created | confirmed | fulfilled | attended | no_show | cancelled
	ScheduledAt   string `json:"scheduled_at,omitempty"`  // solo reservation
	ConfirmedAt   string `json:"confirmed_at,omitempty"`  // cuándo se confirmó
	CompletedAt   string `json:"completed_at,omitempty"`  // cuándo se cumplió/atendido
	CancelledAt   string `json:"cancelled_at,omitempty"`  // cuándo se canceló
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

// AllyOperationItem es un ítem de catálogo dentro de una operación.
type AllyOperationItem struct {
	ID          string `json:"id"`
	OperationID string `json:"operation_id"`
	OfferKind   string `json:"offer_kind"`        // product | service
	OfferID     string `json:"offer_id"`          // id de ally_products o ally_services
	Name        string `json:"name"`              // nombre en el momento
	UnitPriceCents int64 `json:"unit_price_cents"` // snapshot en centavos COP
	Quantity    int    `json:"quantity"`
}

// AllyRedemption es un ticket/QR canjeado una vez.
type AllyRedemption struct {
	ID          string `json:"id"`
	OperationID string `json:"operation_id"`
	TokenHash   string `json:"token_hash"`     // SHA-256, nunca token claro
	ExpiresAt   string `json:"expires_at"`
	RedeemedBy  string `json:"redeemed_by,omitempty"`
	RedeemedAt  string `json:"redeemed_at,omitempty"`
	Status      string `json:"status"` // issued | redeemed | expired | cancelled
	CreatedAt   string `json:"created_at"`
}

// CreateOperationInput es el payload para crear una operación.
type CreateOperationInput struct {
	Kind          string
	RelationshipID string
	AllyID        string
	AthleteID     string
	ScheduledAt   string // solo reservation
}

// UpdateOperationStatusInput es el payload para transitionar el estado.
type UpdateOperationStatusInput struct {
	Status string
}

// CreateOperationItemInput es el payload para agregar un ítem a una operación.
type CreateOperationItemInput struct {
	OperationID string
	OfferKind   string
	OfferID     string
	Name        string
	UnitPriceCents int64
	Quantity    int
}

// CreateRedemptionInput es el payload para crear un ticket/QR.
type CreateRedemptionInput struct {
	OperationID string
	ExpiresAt   string
}

// ErrNotFound is returned when an operation or item is not visible to the caller.
var ErrNotFound = operationsError("operation not found")

type operationsError string

func (e operationsError) Error() string { return string(e) }
func (e operationsError) Is(target error) bool { return target == ErrNotFound }