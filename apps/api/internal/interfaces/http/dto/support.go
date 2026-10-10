package dto

type SupportTicketResponse struct {
	ID            string `json:"id"`
	TicketNumber  int    `json:"ticket_number"`
	Subject       string `json:"subject"`
	Category      string `json:"category"`
	Priority      string `json:"priority"`
	Status        string `json:"status"`
	CoachID       string `json:"coach_id"`
	AthleteID     string `json:"athlete_id,omitempty"`
	AssignedTo    string `json:"assigned_to,omitempty"`
	UnreadCount   int    `json:"unread_count"`
	LastMessageAt string `json:"last_message_at"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
	ResolvedAt    string `json:"resolved_at,omitempty"`
}

type TicketMessageResponse struct {
	ID        string `json:"id"`
	TicketID  string `json:"ticket_id"`
	Author    string `json:"author"`
	AuthorID  string `json:"author_id"`
	Body      string `json:"body"`
	ImageURL  string `json:"image_url,omitempty"`
	ReadAt    string `json:"read_at,omitempty"`
	CreatedAt string `json:"created_at"`
}

type CreateTicketRequest struct {
	Subject  string  `json:"subject"`
	Body     string  `json:"body"`
	Category string  `json:"category"`
	Priority string  `json:"priority"`
	AthleteID string `json:"athlete_id,omitempty"`
	ImageURL string  `json:"image_url,omitempty"`
}

type UpdateTicketRequest struct {
	Status    *string `json:"status,omitempty"`
	Priority  *string `json:"priority,omitempty"`
	Category  *string `json:"category,omitempty"`
	AssignedTo *string `json:"assigned_to,omitempty"`
}

type AddSupportMessageRequest struct {
	Body     string `json:"body"`
	ImageURL string `json:"image_url,omitempty"`
}

type UnreadCountResponse struct {
	Count int `json:"count"`
}