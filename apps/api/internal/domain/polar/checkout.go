package polar

// PolarCheckout represents a Polar payment checkout session.
type PolarCheckout struct {
	ID            string  `json:"id"`
	MembershipID  string  `json:"membership_id"`
	AthleteID     string  `json:"athlete_id"`
	PolarOrderID  string  `json:"polar_order_id"`
	CheckoutURL   string  `json:"checkout_url"`
	Status        string  `json:"status"` // pending, completed, failed, cancelled
	AmountCents   int     `json:"amount_cents"`
	Currency      string  `json:"currency"`
	CreatedAt     string  `json:"created_at"`
	CompletedAt   *string `json:"completed_at,omitempty"`
}