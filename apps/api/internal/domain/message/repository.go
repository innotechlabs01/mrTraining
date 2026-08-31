package message

import "context"

// Repository defines the data access interface for the message domain.
type Repository interface {
	// GetThreads retrieves all message threads for a user (coach or athlete).
	// Returns an empty slice (not nil) if no threads exist.
	GetThreads(ctx context.Context, userID string) ([]*MessageThread, error)

	// GetThread retrieves a single thread by ID.
	GetThread(ctx context.Context, threadID string) (*MessageThread, error)

	// CreateThread creates a new message thread.
	CreateThread(ctx context.Context, thread *MessageThread) error

	// GetMessages retrieves all messages in a thread, ordered by creation date.
	GetMessages(ctx context.Context, threadID string) ([]*Message, error)

	// SendMessage adds a message to a thread and updates the thread's last message.
	SendMessage(ctx context.Context, msg *Message) error

	// MarkThreadRead marks all messages in a thread as read for a user.
	MarkThreadRead(ctx context.Context, threadID, userID string) error
}
