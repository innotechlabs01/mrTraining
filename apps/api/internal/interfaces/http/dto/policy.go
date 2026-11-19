package dto

// ConfigureCommissionRequest is the payload for configuring a commission
// policy (rate + fixed amount) for the authenticated coach.
// POST /api/v1/policies/commission
type ConfigureCommissionRequest struct {
	// RelationshipID is the coach_ally_relationship this commission applies to.
	RelationshipID string `json:"relationship_id"`
	// RateBps is the commission rate in basis points (1000 = 10.00%).
	RateBps int64 `json:"rate_bps"`
	// FixedAmountCents is a fixed commission amount in cents (optional).
	FixedAmountCents int64 `json:"fixed_amount_cents"`
	// Currency for the commission (ISO 4217, e.g. COP, USD).
	Currency string `json:"currency"`
	// ValidFrom is the effective start date/time (UTC, 'YYYY-MM-DD HH:MM:SS').
	ValidFrom string `json:"valid_from"`
}

// CommissionPolicyResponse is the public view of a configured commission policy.
// Mirrors commissiondomain.Agreement.
type CommissionPolicyResponse struct {
	ID               string  `json:"id"`
	RelationshipID   string  `json:"relationship_id"`
	Version          int64   `json:"version"`
	RateBps          int64   `json:"rate_bps"`
	FixedAmountCents int64   `json:"fixed_amount_cents"`
	Currency         string  `json:"currency"`
	ValidFrom        string  `json:"valid_from"`
	ValidTo          string  `json:"valid_to,omitempty"`
	Status           string  `json:"status"`
	CreatedAt        string  `json:"created_at"`
}

// CommissionListResponse is a paginated list of commission entries.
// GET /api/v1/commissions
type CommissionListResponse struct {
	Data  []CommissionEntryResponse `json:"data"`
	Total int                       `json:"total"`
	Page  int                       `json:"page"`
	Limit int                       `json:"limit"`
}
