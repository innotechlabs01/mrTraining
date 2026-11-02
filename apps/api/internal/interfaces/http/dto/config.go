package dto

// PublicPageConfigResponse represents public page config in API responses.
type PublicPageConfigResponse struct {
	ID        string `json:"id"`
	CoachID   string `json:"coach_id"`
	BrandName string `json:"brand_name"`
	Tagline   string `json:"tagline"`
	Welcome   string `json:"welcome_message"`
	Footer    string `json:"footer_text"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// UpdatePublicPageConfigRequest is the payload for updating public page config.
type UpdatePublicPageConfigRequest struct {
	BrandName   *string `json:"brand_name,omitempty"`
	Tagline     *string `json:"tagline,omitempty"`
	WelcomeMsg  *string `json:"welcome_message,omitempty"`
	FooterText  *string `json:"footer_text,omitempty"`
}