// Package commission models the versioned commission agreements between a coach
// and an ally. Phase B only stores the agreement definition; no commission is
// calculated, no settlement is produced and no money moves through the platform.
package commission

// Agreement is one version of a commission agreement between a coach and an
// ally. Money is stored in integer cents and the rate in basis points, never in
// binary floating point.
type Agreement struct {
	ID               string  `json:"id"`
	RelationshipID   string  `json:"relationship_id"`
	Version          int64   `json:"version"`
	RateBps          int64   `json:"rate_bps"`
	FixedAmountCents int64   `json:"fixed_amount_cents"`
	EligibleBaseRule string  `json:"eligible_base_rule"`
	Rounding         string  `json:"rounding"`
	Currency         string  `json:"currency"`
	ValidFrom        string  `json:"valid_from"`
	ValidTo          *string `json:"valid_to,omitempty"`
	Status           string  `json:"status"`
	AcceptedBy       string  `json:"accepted_by,omitempty"`
	AcceptedAt       string  `json:"accepted_at,omitempty"`
	CreatedAt        string  `json:"created_at"`
}

// CreateAgreementInput is the payload to register a new agreement version.
// CoachID is the acting coach; ownership of the relationship is verified inside
// the same transaction that writes the agreement.
type CreateAgreementInput struct {
	RelationshipID   string
	CoachID          string
	RateBps          int64
	FixedAmountCents int64
	Currency         string
	ValidFrom        string // 'YYYY-MM-DD HH:MM:SS' (UTC)
	AcceptedBy       string // optional; empty means a proposed agreement
}
