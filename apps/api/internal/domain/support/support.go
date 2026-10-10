// Package support defines the support ticket domain entities and repository contract.
package support

// TicketStatus represents the status of a support ticket.
type TicketStatus string

const (
	TicketStatusOpen       TicketStatus = "open"
	TicketStatusInProgress TicketStatus = "in_progress"
	TicketStatusResolved   TicketStatus = "resolved"
	TicketStatusClosed     TicketStatus = "closed"
)

// TicketCategory represents the category of a support ticket.
type TicketCategory string

const (
	TicketCategoryProblem   TicketCategory = "problem"
	TicketCategoryQuestion  TicketCategory = "question"
	TicketCategoryFeature   TicketCategory = "feature"
	TicketCategoryBilling   TicketCategory = "billing"
	TicketCategoryTechnical TicketCategory = "technical"
	TicketCategoryOther     TicketCategory = "other"
)

// TicketPriority represents the priority of a support ticket.
type TicketPriority string

const (
	TicketPriorityLow    TicketPriority = "low"
	TicketPriorityMedium TicketPriority = "medium"
	TicketPriorityHigh   TicketPriority = "high"
	TicketPriorityUrgent TicketPriority = "urgent"
)

// TicketAuthor represents who authored a message.
type TicketAuthor string

const (
	TicketAuthorCoach   TicketAuthor = "coach"
	TicketAuthorSupport TicketAuthor = "support"
	TicketAuthorAthlete TicketAuthor = "athlete"
)

// SupportTicket represents a support ticket.
type SupportTicket struct {
	ID            string         `json:"id"`
	TicketNumber  int            `json:"ticket_number"`
	Subject       string         `json:"subject"`
	Category      TicketCategory `json:"category"`
	Priority      TicketPriority `json:"priority"`
	Status        TicketStatus   `json:"status"`
	CoachID       string         `json:"coach_id"`
	AthleteID     string         `json:"athlete_id,omitempty"`
	AssignedTo    string         `json:"assigned_to,omitempty"`
	UnreadCount   int            `json:"unread_count"`
	LastMessageAt string         `json:"last_message_at"`
	CreatedAt     string         `json:"created_at"`
	UpdatedAt     string         `json:"updated_at"`
	ResolvedAt    string         `json:"resolved_at,omitempty"`
}

// TicketMessage represents a message in a support ticket thread.
type TicketMessage struct {
	ID        string       `json:"id"`
	TicketID  string       `json:"ticket_id"`
	Author    TicketAuthor `json:"author"`
	AuthorID  string       `json:"author_id"`
	Body      string       `json:"body"`
	ImageURL  string       `json:"image_url,omitempty"`
	ReadAt    string       `json:"read_at,omitempty"`
	CreatedAt string       `json:"created_at"`
}