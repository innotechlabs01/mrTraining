package athlete

import (
	"time"

	"github.com/google/uuid"
)

type DomainEvent interface {
	AggregateID() uuid.UUID
	EventType() string
	OccurredAt() time.Time
}

type AthleteCoachAssigned struct {
	AthleteID  uuid.UUID
	OldCoachID *uuid.UUID
	NewCoachID uuid.UUID
	occurredAt time.Time
}

func (e AthleteCoachAssigned) AggregateID() uuid.UUID { return e.AthleteID }
func (e AthleteCoachAssigned) EventType() string       { return "athlete.coach_assigned" }
func (e AthleteCoachAssigned) OccurredAt() time.Time   { return e.occurredAt }
