package config

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