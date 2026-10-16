// Package ally_catalog models the public commercial catalog of an ally
// (products and services). Identifiers, tables and columns are English on
// purpose; business wording stays Spanish in UI.
package ally_catalog

// AllyProduct is one product offered by an ally. price_cents and stock are
// integers; currency is COP-only in the MVP.
type AllyProduct struct {
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

// AllyService is one bookable service offered by an ally.
type AllyService struct {
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

// CreateProductInput is the payload to register a new product for an ally.
type CreateProductInput struct {
	AllyID      string
	Name        string
	Description string
	ImageURL    string
	PriceCents  int64
	Currency    string
	Stock       int
	Active      bool
}

// UpdateProductInput is the payload to update an existing product. Zero-value
// fields are left unchanged (omitempty semantics applied by the service).
type UpdateProductInput struct {
	Name        *string
	Description *string
	ImageURL    *string
	PriceCents  *int64
	Currency    *string
	Stock       *int
	Active      *bool
}

// CreateServiceInput is the payload to register a new service for an ally.
type CreateServiceInput struct {
	AllyID      string
	Name        string
	Description string
	ImageURL    string
	PriceCents  int64
	Currency    string
	DurationMin int
	Capacity    int
	Active      bool
}

// UpdateServiceInput is the payload to update an existing service.
type UpdateServiceInput struct {
	Name        *string
	Description *string
	ImageURL    *string
	PriceCents  *int64
	Currency    *string
	DurationMin *int
	Capacity    *int
	Active      *bool
}

// ErrNotFound is returned when a catalog item is not visible to the caller.
var ErrNotFound = catalogError("catalog item not found")

type catalogError string

func (e catalogError) Error() string { return string(e) }

func (e catalogError) Is(target error) bool { return target == ErrNotFound }
