package dto

// CreatePolarCheckoutRequest is the payload for creating a Polar checkout.
type CreatePolarCheckoutRequest struct {
	MembershipID string `json:"membership_id"`
}

// PolarCheckoutResponse is the response shape for a Polar checkout.
type PolarCheckoutResponse struct {
	ID           string  `json:"id"`
	MembershipID string  `json:"membership_id"`
	PolarOrderID string  `json:"polar_order_id"`
	CheckoutURL  string  `json:"checkout_url"`
	Status       string  `json:"status"`
	AmountCents  int     `json:"amount_cents"`
	Currency     string  `json:"currency"`
	CreatedAt    string  `json:"created_at"`
	CompletedAt  *string `json:"completed_at,omitempty"`
}