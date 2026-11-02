package dto

// CreateThreadRequest is the payload for creating a new message thread.
type CreateThreadRequest struct {
	AthleteID string `json:"athlete_id"`
	Subject   string `json:"subject,omitempty"`
	Content   string `json:"content"`
}

// AddMessageRequest is the payload for adding a message to a thread.
type AddMessageRequest struct {
	Content string `json:"content"`
}

// MarkReadRequest is the payload for marking a thread as read.
type MarkReadRequest struct {
	ThreadID string `json:"thread_id"`
}

// MessageThreadResponse represents a thread in API responses.
type MessageThreadResponse struct {
	ID           string `json:"id"`
	CoachID      string `json:"coach_id"`
	AthleteID    string `json:"athlete_id"`
	AthleteName  string `json:"athlete_name,omitempty"`
	Subject      string `json:"subject,omitempty"`
	LastMessage  string `json:"last_message,omitempty"`
	LastSentAt   string `json:"last_sent_at,omitempty"`
	UnreadCount  int    `json:"unread_count"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// MessageResponse represents a single message in API responses.
type MessageResponse struct {
	ID         string `json:"id"`
	ThreadID   string `json:"thread_id"`
	SenderID   string `json:"sender_id"`
	SenderRole string `json:"sender_role"`
	Content    string `json:"content"`
	IsRead     bool   `json:"is_read"`
	CreatedAt  string `json:"created_at"`
}

// ThreadWithMessagesResponse includes thread and its messages.
type ThreadWithMessagesResponse struct {
	Thread    MessageThreadResponse `json:"thread"`
	Messages  []MessageResponse     `json:"messages"`
}