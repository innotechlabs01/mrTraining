package dto

// AllyProductResponse is the public view of an ally product.
type AllyProductResponse struct {
	ID          string `json:"id"`
	AllyID      string `json:"ally_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url,omitempty"`
	PriceCents  int64  `json:"price_cents"`
	Currency    string `json:"currency"`
	Stock       int    `json:"stock"`
	Active      bool   `json:"active"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// CreateAllyProductRequest is the payload to create a product for an ally.
type CreateAllyProductRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	ImageURL    string `json:"image_url,omitempty"`
	PriceCents  int64  `json:"price_cents"`
	Currency    string `json:"currency"`
	Stock       int    `json:"stock"`
	Active      bool   `json:"active"`
}

// UpdateAllyProductRequest is the payload to update a product. Omitted fields
// are left unchanged.
type UpdateAllyProductRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	ImageURL    *string `json:"image_url,omitempty"`
	PriceCents  *int64  `json:"price_cents,omitempty"`
	Currency    *string `json:"currency,omitempty"`
	Stock       *int    `json:"stock,omitempty"`
	Active      *bool   `json:"active,omitempty"`
}

// AllyServiceResponse is the public view of an ally service.
type AllyServiceResponse struct {
	ID          string `json:"id"`
	AllyID      string `json:"ally_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url,omitempty"`
	PriceCents  int64  `json:"price_cents"`
	Currency    string `json:"currency"`
	DurationMin int    `json:"duration_min"`
	Capacity    int    `json:"capacity"`
	Active      bool   `json:"active"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// CreateAllyServiceRequest is the payload to create a service for an ally.
type CreateAllyServiceRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	ImageURL    string `json:"image_url,omitempty"`
	PriceCents  int64  `json:"price_cents"`
	Currency    string `json:"currency"`
	DurationMin int    `json:"duration_min"`
	Capacity    int    `json:"capacity"`
	Active      bool   `json:"active"`
}

// UpdateAllyServiceRequest is the payload to update a service. Omitted fields
// are left unchanged.
type UpdateAllyServiceRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	ImageURL    *string `json:"image_url,omitempty"`
	PriceCents  *int64  `json:"price_cents,omitempty"`
	Currency    *string `json:"currency,omitempty"`
	DurationMin *int    `json:"duration_min,omitempty"`
	Capacity    *int    `json:"capacity,omitempty"`
	Active      *bool   `json:"active,omitempty"`
}
