package dto

import "encoding/json"

// PlanDiscountDTO embeds discount fields in a plan response.
type PlanDiscountDTO struct {
	Type  string  `json:"type"`
	Value float64 `json:"value"`
	Label string  `json:"label,omitempty"`
	From  string  `json:"valid_from,omitempty"`
	Until string  `json:"valid_until,omitempty"`
	Code  string  `json:"code,omitempty"`
}

// PlanResponse is the JSON shape for a plan.
type PlanResponse struct {
	ID                 string           `json:"id"`
	Name               string           `json:"name"`
	Description        string           `json:"description"`
	Price              float64          `json:"price"`
	Currency           string           `json:"currency"`
	BillingPeriod      string           `json:"billing_period"`
	MaxAthletes        int              `json:"max_athletes"`
	MaxSessionsPerWeek int              `json:"max_sessions_per_week"`
	IsActive           bool             `json:"is_active"`
	AthleteCount       int              `json:"athlete_count"`
	CoachID            string           `json:"coach_id"`
	TRM                float64          `json:"trm"`
	Discount           *PlanDiscountDTO `json:"discount,omitempty"`
	CreatedAt          string           `json:"created_at"`
	UpdatedAt          string           `json:"updated_at"`
}

// CreatePlanRequest is the payload for creating a plan.
type CreatePlanRequest struct {
	Name               string  `json:"name"`
	Description        string  `json:"description"`
	Price              float64 `json:"price"`
	Currency           string  `json:"currency"`
	BillingPeriod      string  `json:"billing_period"`
	MaxAthletes        int     `json:"max_athletes"`
	MaxSessionsPerWeek int     `json:"max_sessions_per_week"`
	IsActive           bool    `json:"is_active"`
	TRM                float64 `json:"trm"`
	DiscountType       string  `json:"discount_type"`
	DiscountValue      float64 `json:"discount_value"`
	DiscountLabel      string  `json:"discount_label"`
	DiscountValidFrom  string  `json:"discount_valid_from"`
	DiscountValidUntil string  `json:"discount_valid_until"`
	DiscountCode       string  `json:"discount_code"`
}

// UnmarshalJSON accepts both snake_case and camelCase keys for plan creation payloads.
func (r *CreatePlanRequest) UnmarshalJSON(data []byte) error {
	type alias CreatePlanRequest
	var a alias
	if err := json.Unmarshal(data, &a); err != nil {
		return err
	}
	*r = CreatePlanRequest(a)

	var camel struct {
		BillingPeriod      string  `json:"billingPeriod"`
		MaxAthletes        *int    `json:"maxAthletes"`
		MaxSessionsPerWeek *int    `json:"maxSessionsPerWeek"`
		IsActive           *bool   `json:"isActive"`
		DiscountType       string  `json:"discountType"`
		DiscountValue      float64 `json:"discountValue"`
		DiscountLabel      string  `json:"discountLabel"`
		DiscountValidFrom  string  `json:"discountValidFrom"`
		DiscountValidUntil string  `json:"discountValidUntil"`
		DiscountCode       string  `json:"discountCode"`
	}
	if err := json.Unmarshal(data, &camel); err != nil {
		return nil
	}
	if r.BillingPeriod == "" && camel.BillingPeriod != "" {
		r.BillingPeriod = camel.BillingPeriod
	}
	if r.MaxAthletes == 0 && camel.MaxAthletes != nil {
		r.MaxAthletes = *camel.MaxAthletes
	}
	if r.MaxSessionsPerWeek == 0 && camel.MaxSessionsPerWeek != nil {
		r.MaxSessionsPerWeek = *camel.MaxSessionsPerWeek
	}
	if !r.IsActive && camel.IsActive != nil {
		r.IsActive = *camel.IsActive
	}
	if r.DiscountType == "" && camel.DiscountType != "" {
		r.DiscountType = camel.DiscountType
	}
	if r.DiscountValue == 0 && camel.DiscountValue != 0 {
		r.DiscountValue = camel.DiscountValue
	}
	if r.DiscountLabel == "" && camel.DiscountLabel != "" {
		r.DiscountLabel = camel.DiscountLabel
	}
	if r.DiscountValidFrom == "" && camel.DiscountValidFrom != "" {
		r.DiscountValidFrom = camel.DiscountValidFrom
	}
	if r.DiscountValidUntil == "" && camel.DiscountValidUntil != "" {
		r.DiscountValidUntil = camel.DiscountValidUntil
	}
	if r.DiscountCode == "" && camel.DiscountCode != "" {
		r.DiscountCode = camel.DiscountCode
	}
	return nil
}

// UpdatePlanRequest is the payload for updating a plan. All fields optional.
type UpdatePlanRequest struct {
	Name               *string  `json:"name,omitempty"`
	Description        *string  `json:"description,omitempty"`
	Price              *float64 `json:"price,omitempty"`
	Currency           *string  `json:"currency,omitempty"`
	BillingPeriod      *string  `json:"billing_period,omitempty"`
	MaxAthletes        *int     `json:"max_athletes,omitempty"`
	MaxSessionsPerWeek *int     `json:"max_sessions_per_week,omitempty"`
	IsActive           *bool    `json:"is_active,omitempty"`
	TRM                *float64 `json:"trm,omitempty"`
	DiscountType       *string  `json:"discount_type,omitempty"`
	DiscountValue      *float64 `json:"discount_value,omitempty"`
	DiscountLabel      *string  `json:"discount_label,omitempty"`
	DiscountValidFrom  *string  `json:"discount_valid_from,omitempty"`
	DiscountValidUntil *string  `json:"discount_valid_until,omitempty"`
	DiscountCode       *string  `json:"discount_code,omitempty"`
}

// UnmarshalJSON accepts both snake_case and camelCase keys for plan update payloads.
func (r *UpdatePlanRequest) UnmarshalJSON(data []byte) error {
	type alias UpdatePlanRequest
	var a alias
	if err := json.Unmarshal(data, &a); err != nil {
		return err
	}
	*r = UpdatePlanRequest(a)

	var camel struct {
		BillingPeriod      *string  `json:"billingPeriod,omitempty"`
		MaxAthletes        *int     `json:"maxAthletes,omitempty"`
		MaxSessionsPerWeek *int     `json:"maxSessionsPerWeek,omitempty"`
		IsActive           *bool    `json:"isActive,omitempty"`
		DiscountType       *string  `json:"discountType,omitempty"`
		DiscountValue      *float64 `json:"discountValue,omitempty"`
		DiscountLabel      *string  `json:"discountLabel,omitempty"`
		DiscountValidFrom  *string  `json:"discountValidFrom,omitempty"`
		DiscountValidUntil *string  `json:"discountValidUntil,omitempty"`
		DiscountCode       *string  `json:"discountCode,omitempty"`
	}
	if err := json.Unmarshal(data, &camel); err != nil {
		return nil
	}
	if r.BillingPeriod == nil && camel.BillingPeriod != nil {
		r.BillingPeriod = camel.BillingPeriod
	}
	if r.MaxAthletes == nil && camel.MaxAthletes != nil {
		r.MaxAthletes = camel.MaxAthletes
	}
	if r.MaxSessionsPerWeek == nil && camel.MaxSessionsPerWeek != nil {
		r.MaxSessionsPerWeek = camel.MaxSessionsPerWeek
	}
	if r.IsActive == nil && camel.IsActive != nil {
		r.IsActive = camel.IsActive
	}
	if r.DiscountType == nil && camel.DiscountType != nil {
		r.DiscountType = camel.DiscountType
	}
	if r.DiscountValue == nil && camel.DiscountValue != nil {
		r.DiscountValue = camel.DiscountValue
	}
	if r.DiscountLabel == nil && camel.DiscountLabel != nil {
		r.DiscountLabel = camel.DiscountLabel
	}
	if r.DiscountValidFrom == nil && camel.DiscountValidFrom != nil {
		r.DiscountValidFrom = camel.DiscountValidFrom
	}
	if r.DiscountValidUntil == nil && camel.DiscountValidUntil != nil {
		r.DiscountValidUntil = camel.DiscountValidUntil
	}
	if r.DiscountCode == nil && camel.DiscountCode != nil {
		r.DiscountCode = camel.DiscountCode
	}
	return nil
}

// TRMResponse is the JSON shape for the current TRM rate.
type TRMResponse struct {
	Value     float64 `json:"value"`
	VigenciaD string  `json:"vigencia_desde"`
}

// PlanCatalogItem is an item in the plan catalog for public coach landing.
type PlanCatalogItem struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Currency    string  `json:"currency"`
	Duration    string  `json:"duration"`
	Benefits    string  `json:"benefits"`
	CTAText     string  `json:"cta_text"`
}

// CoachLandingResponse is the full response of a coach's public landing.
type CoachLandingResponse struct {
	Slug         string             `json:"slug"`
	CoachName    string             `json:"coach_name"`
	CoachPhoto   string             `json:"coach_photo"`
	Biography    string             `json:"biography"`
	Specialities []string           `json:"specialities"`
	Services     []string           `json:"services"`
	PlanCatalog  []PlanCatalogItem  `json:"plan_catalog"`
	CtaText      string             `json:"cta_text"`
}

// CoachPlansResponse is the response with the list of plans for a coach.
type CoachPlansResponse struct {
	Slug   string          `json:"slug"`
	Plans  []PlanCatalogItem `json:"plans"`
}
