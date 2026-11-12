package dto

// StartCheckoutRequest is the payload for starting a payment before the buyer
// has an account.
type StartCheckoutRequest struct {
	// PlanID is the platform plan being bought.
	PlanID string `json:"plan_id"`
	// Email is where the buyer wants the account. It is captured up front so
	// the registration can continue right after the payment.
	Email string `json:"email"`
}

// StartCheckoutResponse is the result of starting a checkout.
type StartCheckoutResponse struct {
	// CheckoutID identifies the pending checkout.
	CheckoutID string `json:"checkout_id"`
	// CheckoutURL is where the payer must be redirected.
	CheckoutURL string `json:"checkout_url,omitempty"`
	// Recovered is true when the buyer had already paid for this plan and the
	// pending checkout is recovered instead of charging again.
	Recovered bool `json:"recovered,omitempty"`
}

// ClaimCheckoutResponse is the result of claiming a paid checkout.
type ClaimCheckoutResponse struct {
	CheckoutID string `json:"checkout_id"`
	CoachID    string `json:"coach_id"`
	// CoachCode is the invite code of the coach.
	CoachCode string `json:"coach_code"`
	PlanID    string `json:"plan_id"`
	PlanName  string `json:"plan_name"`
}
