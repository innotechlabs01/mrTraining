package dto

// AlertResponse is the response shape for an alert.
type AlertResponse struct {
	ID          string  `json:"id"`
	Type        string  `json:"type"`
	Severity    string  `json:"severity"`
	Title       string  `json:"title"`
	Message     string  `json:"message"`
	IsRead      bool    `json:"is_read"`
	CreatedAt   string  `json:"created_at"`
	DismissedAt *string `json:"dismissed_at,omitempty"`
}