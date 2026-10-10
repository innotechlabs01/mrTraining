package support

import "context"

// Repository defines persistence operations for SupportTicket.
type Repository interface {
	// Coach methods
	ListByCoach(ctx context.Context, coachID string, status *TicketStatus) ([]*SupportTicket, error)
	GetByID(ctx context.Context, id string) (*SupportTicket, error)
	Create(ctx context.Context, ticket *SupportTicket) error
	Update(ctx context.Context, ticket *SupportTicket) error
	Delete(ctx context.Context, id string) error

	// Athlete methods
	ListByAthlete(ctx context.Context, athleteID string, status *TicketStatus) ([]*SupportTicket, error)

	// Messages
	ListMessages(ctx context.Context, ticketID string) ([]*TicketMessage, error)
	GetMessageByID(ctx context.Context, id string) (*TicketMessage, error)
	CreateMessage(ctx context.Context, msg *TicketMessage) error
	MarkMessagesRead(ctx context.Context, ticketID, readerID string, author TicketAuthor) error
	GetUnreadCount(ctx context.Context, ticketID, readerID string, author TicketAuthor) (int, error)
}