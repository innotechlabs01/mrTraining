package alert

// Alert represents a computed alert for an athlete.
type Alert struct {
	ID          string  `json:"id"`
	AthleteID   string  `json:"athlete_id"`
	Type        string  `json:"type"`
	Severity    string  `json:"severity"` // low, medium, high
	Title       string  `json:"title"`
	Message     string  `json:"message"`
	IsRead      bool    `json:"is_read"`
	CreatedAt   string  `json:"created_at"`
	DismissedAt *string `json:"dismissed_at,omitempty"`
}