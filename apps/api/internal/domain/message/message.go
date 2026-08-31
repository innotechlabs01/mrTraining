// Package message defines the core message domain entities for the MR Training API.
// It includes MessageThread and Message types for coach-athlete messaging.
package message

// MessageThread represents a conversation thread between a coach and athlete.
type MessageThread struct {
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

// Message represents a single message within a thread.
type Message struct {
	ID         string `json:"id"`
	ThreadID   string `json:"thread_id"`
	SenderID   string `json:"sender_id"`
	SenderRole string `json:"sender_role"` // "coach", "athlete"
	Content    string `json:"content"`
	IsRead     bool   `json:"is_read"`
	CreatedAt  string `json:"created_at"`
}
