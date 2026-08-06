package coach

import (
	"time"

	"github.com/google/uuid"
)

type DomainEvent interface {
	AggregateID() uuid.UUID
	EventType() string
	OccurredAt() time.Time
}
