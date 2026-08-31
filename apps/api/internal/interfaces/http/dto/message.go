package dto

// --- Message Request DTOs ---

// CreateMessageThreadRequest is the payload for creating a new message thread.
type CreateMessageThreadRequest struct {
	AthleteID  string `json:"athlete_id"`
	AthleteName string `json:"athlete_name"`
	Subject    string `json:"subject"`
}

// SendMessageRequest is the payload for sending a message in a thread.
type SendMessageRequest struct {
	Content string `json:"content"`
}

// --- Message Response DTOs ---

// MessageThreadResponse represents a message thread in API responses.
type MessageThreadResponse struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	AthleteID   string `json:"athlete_id"`
	AthleteName string `json:"athlete_name,omitempty"`
	Subject     string `json:"subject,omitempty"`
	LastMessage string `json:"last_message,omitempty"`
	LastSentAt  string `json:"last_sent_at,omitempty"`
	UnreadCount int    `json:"unread_count"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// ChatMessageResponse represents a message in API responses for legacy coach-athlete chat.
type ChatMessageResponse struct {
	ID         string `json:"id"`
	ThreadID   string `json:"thread_id"`
	SenderID   string `json:"sender_id"`
	SenderRole string `json:"sender_role"`
	Content    string `json:"content"`
	IsRead     bool   `json:"is_read"`
	CreatedAt  string `json:"created_at"`
}

// ThreadDetailResponse represents a thread with its messages.
type ThreadDetailResponse struct {
	Thread   MessageThreadResponse `json:"thread"`
	Messages []ChatMessageResponse `json:"messages"`
}
