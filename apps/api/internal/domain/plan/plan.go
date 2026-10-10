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
