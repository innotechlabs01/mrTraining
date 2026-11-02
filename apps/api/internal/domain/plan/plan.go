// Package plan defines the plan domain entity and repository contract.
package plan

// Plan represents a coach's subscription/pricing plan shown on their public landing.
type Plan struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Description        string  `json:"description"`
	Price              float64 `json:"price"`
	Currency           string  `json:"currency"`
	BillingPeriod      string  `json:"billing_period"`
	MaxAthletes        int     `json:"max_athletes"`
	MaxSessionsPerWeek int     `json:"max_sessions_per_week"`
	IsActive           bool    `json:"is_active"`
	AthleteCount       int     `json:"athlete_count"`
	CoachID            string  `json:"coach_id"`
	TRM                float64 `json:"trm"`
	DiscountType       string  `json:"discount_type,omitempty"`
	DiscountValue      float64 `json:"discount_value,omitempty"`
	DiscountLabel      string  `json:"discount_label,omitempty"`
	DiscountValidFrom  string  `json:"discount_valid_from,omitempty"`
	DiscountValidUntil string  `json:"discount_valid_until,omitempty"`
	DiscountCode       string  `json:"discount_code,omitempty"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

// Version represents an active version of a plan with pricing and duration.
type Version struct {
	ID          string `json:"id"`
	PlanID      string `json:"plan_id"`
	PriceCents  int    `json:"price_cents"`
	Currency    string `json:"currency"`
	DurationUnit string `json:"duration_unit"` // "week", "month", "quarter", "year"
	Benefits    string `json:"benefits"`
	CTAText     string `json:"cta_text"`
	IsActive    bool   `json:"is_active"`
	CreatedAt   string `json:"created_at"`
}
