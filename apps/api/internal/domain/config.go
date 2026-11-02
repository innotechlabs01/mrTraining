package config

import "context"

// PublicPageConfig represents the public page configuration for a coach.
type PublicPageConfig struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	BrandName   string `json:"brand_name"`
	Tagline     string `json:"tagline"`
	WelcomeMsg  string `json:"welcome_message"`
	FooterText  string `json:"footer_text"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// Repository defines the data access interface for public page config.
type Repository interface {
	// GetByCoachID retrieves the public page config for a coach.
	// Returns nil if not found.
	GetByCoachID(ctx context.Context, coachID string) (*PublicPageConfig, error)

	// Upsert creates or updates the public page config for a coach.
	Upsert(ctx context.Context, cfg *PublicPageConfig) error
}