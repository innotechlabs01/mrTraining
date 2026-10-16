package dto

// AllyOperationResponse is the public view of an ally operation.
type AllyOperationResponse struct {
	ID            string `json:"id"`
	Kind          string `json:"kind"`
	RelationshipID string `json:"relationship_id"`
	AllyID        string `json:"ally_id"`
	AthleteID     string `json:"athlete_id"`
	Status        string `json:"status"`
	ScheduledAt   string `json:"scheduled_at,omitempty"`
	ConfirmedAt   string `json:"confirmed_at,omitempty"`
	CompletedAt   string `json:"completed_at,omitempty"`
	CancelledAt   string `json:"cancelled_at,omitempty"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

// CreateAllyOperationRequest is the payload to create an operation (order or reservation).
type CreateAllyOperationRequest struct {
	Kind          string `json:"kind"`              // order | reservation
	RelationshipID string `json:"relationship_id"`   // R7: coach-ally relationship
	ScheduledAt   string `json:"scheduled_at,omitempty"` // solo reservation
}

// AllyOperationItemResponse is the public view of an operation item.
type AllyOperationItemResponse struct {
	ID            string `json:"id"`
	OperationID   string `json:"operation_id"`
	OfferKind     string `json:"offer_kind"`        // product | service
	OfferID       string `json:"offer_id"`
	Name          string `json:"name"`
	UnitPriceCents int64 `json:"unit_price_cents"`
	Quantity      int    `json:"quantity"`
}

// AddAllyOperationItemRequest is the payload to add an item to an operation.
type AddAllyOperationItemRequest struct {
	OfferKind     string `json:"offer_kind"`        // product | service
	OfferID       string `json:"offer_id"`
	Name          string `json:"name"`
	UnitPriceCents int64 `json:"unit_price_cents"`
	Quantity      int    `json:"quantity"`
}

// AllyRedemptionResponse is the public view of a redemption (ticket/QR).
type AllyRedemptionResponse struct {
	ID          string `json:"id"`
	OperationID string `json:"operation_id"`
	TokenHash   string `json:"token_hash"`
	ExpiresAt   string `json:"expires_at"`
	RedeemedBy  string `json:"redeemed_by,omitempty"`
	RedeemedAt  string `json:"redeemed_at,omitempty"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
}

// CreateAllyRedemptionRequest is the payload to create a redemption ticket.
type CreateAllyRedemptionRequest struct {
	ExpiresAt string `json:"expires_at"`
}

// RedeemRedemptionRequest is the payload to redeem a ticket/QR token.
type RedeemRedemptionRequest struct {
	Token      string `json:"token"`
	RedeemedBy string `json:"redeemed_by"`
}

// RedeemRedemptionResponse is the response after redeeming a ticket.
type RedeemRedemptionResponse struct {
	Redeemed bool   `json:"redeemed"`
	Status   string `json:"status"`
	Message  string `json:"message,omitempty"`
}
