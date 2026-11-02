// Package dto provides request and response data transfer objects for the MR Training API.
// DTOs decouple the HTTP layer from domain entities, allowing the API contract
// to evolve independently of the database schema.
package dto

// PaginationParams holds standard query parameters for paginated endpoints.
type PaginationParams struct {
	// Page is the 1-based page number.
	Page int `json:"page"`
	// Limit is the maximum number of items per page.
	Limit int `json:"limit"`
}

// Normalize applies defaults and bounds to pagination parameters.
// Page defaults to 1, limit defaults to 20, max 100.
func (p *PaginationParams) Normalize() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 {
		p.Limit = 20
	}
	if p.Limit > 100 {
		p.Limit = 100
	}
}

// ErrorResponse represents a structured API error response.
type ErrorResponse struct {
	// Error contains the error details.
	Error ErrorBody `json:"error"`
}

// ErrorBody contains the error code and human-readable message.
type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
