package dto

// CreateAllyPurchaseRequest is the payload to purchase an ally product.
type CreateAllyPurchaseRequest struct {
	Quantity int `json:"quantity"`
}

// AllyPurchaseResponse is the public view of a completed ally purchase.
type AllyPurchaseResponse struct {
	OperationID       string `json:"operation_id"`
	OperationKind     string `json:"operation_kind"`
	RelationshipID    string `json:"relationship_id"`
	AllyID            string `json:"ally_id"`
	CommissionEntryID string `json:"commission_entry_id"`
	CommissionCents   int64  `json:"commission_cents"`
	TotalCents        int64  `json:"total_cents"`
	Currency          string `json:"currency"`
}
