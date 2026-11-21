package eventbus

import (
	"context"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Publisher publishes canonical domain events to an underlying message broker.
type Publisher interface {
	Publish(ctx context.Context, event DomainEvent) error
}

// Handler consumes a single DomainEvent. Returning nil acknowledges the event;
// returning an error triggers retry with backoff and eventual DLQ placement.
type Handler func(ctx context.Context, event DomainEvent) error

// Subscription controls the lifecycle of an active consumer subscription.
type Subscription interface {
	Unsubscribe() error
}

// Subscriber registers durable consumers for event subjects.
type Subscriber interface {
	Subscribe(ctx context.Context, durableName, subject string, handler Handler) (Subscription, error)
}

// OutboxWriter writes DomainEvents into the transactional PostgreSQL outbox.
// Callers pass the active transaction executor (e.g. *sql.Tx or uow) when atomic
// commit with domain state is required, or nil to use a standalone worker transaction.
type OutboxWriter interface {
	Insert(ctx context.Context, exec database.Executor, event DomainEvent) error
}

// ProcessedEventStore enforces consumer-level idempotency across at-least-once deliveries.
type ProcessedEventStore interface {
	IsProcessed(ctx context.Context, consumerName, eventID string) (bool, error)
	MarkProcessed(ctx context.Context, consumerName, eventID, subject string) error
}

// DeadLetterRecord captures permanently failed events routed to the DLQ table.
type DeadLetterRecord struct {
	StreamName    string
	Subject       string
	ConsumerName  string
	EventID       string
	EventType     string
	CorrelationID string
	Payload       []byte
	ErrorMessage  string
	Attempts      int
}

// DeadLetterStore persists DLQ inspection records for operator replay.
type DeadLetterStore interface {
	SaveDeadLetter(ctx context.Context, rec DeadLetterRecord) error
}
