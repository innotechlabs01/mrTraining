package dto

// CreateMembershipRequest is the payload for creating a new membership.
type CreateMembershipRequest struct {
	// AthleteID is the ID of the athlete to create the membership for.
	AthleteID string `json:"athlete_id"`
	// PlanName is the name of the subscription plan.
	PlanName string `json:"plan_name"`
	// PlanPrice is the price of the plan per billing period.
	PlanPrice float64 `json:"plan_price"`
	// BillingPeriod is the billing frequency: "monthly" or "yearly". Defaults to "monthly".
	BillingPeriod string `json:"billing_period"`
	// StartDate is the ISO date to start the membership. Defaults to today.
	StartDate string `json:"start_date"`
}

// MembershipResponse represents a membership in API responses.
type MembershipResponse struct {
	ID                 string  `json:"id"`
	AthleteID          string  `json:"athlete_id"`
	CoachID            string  `json:"coach_id"`
	PlanName           string  `json:"plan_name"`
	PlanPrice          float64 `json:"plan_price"`
	BillingPeriod      string  `json:"billing_period"`
	Status             string  `json:"status"`
	CurrentPeriodStart string  `json:"current_period_start"`
	CurrentPeriodEnd   string  `json:"current_period_end"`
	GracePeriodDays    int     `json:"grace_period_days"`
	PaymentDueDate     string  `json:"payment_due_date"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

// PaymentResponse represents a payment record in API responses.
type PaymentResponse struct {
	ID           string  `json:"id"`
	MembershipID string  `json:"membership_id"`
	Amount       float64 `json:"amount"`
	Currency     string  `json:"currency"`
	Status       string  `json:"status"`
	PolarOrderID string  `json:"polar_order_id,omitempty"`
	PeriodStart  string  `json:"period_start"`
	PeriodEnd    string  `json:"period_end"`
	PaidAt       string  `json:"paid_at,omitempty"`
	CreatedAt    string  `json:"created_at"`
}

// MembershipStatusResponse represents the gate-status payload for the membership status endpoint.
type MembershipStatusResponse struct {
	HasActiveMembership bool                  `json:"hasActiveMembership"`
	Status              string                `json:"status"`
	IsInGracePeriod     bool                  `json:"isInGracePeriod"`
	DaysRemaining       int                   `json:"daysRemaining"`
	ExpiresAt           string                `json:"expiresAt"`
	Membership          *MembershipSummary    `json:"membership"`
	MembershipID        string                `json:"membershipId"`
}

// MembershipSummary is a summary of membership details shown in the status response.
type MembershipSummary struct {
	ID                 string  `json:"id"`
	PlanName           string  `json:"planName"`
	PlanPrice          float64 `json:"planPrice"`
	BillingPeriod      string  `json:"billingPeriod"`
	CurrentPeriodStart string  `json:"currentPeriodStart"`
	CurrentPeriodEnd   string  `json:"currentPeriodEnd"`
	PaymentDueDate     string  `json:"paymentDueDate"`
	AthleteID          string  `json:"athleteId"`
	CoachID            string  `json:"coachId"`
}
