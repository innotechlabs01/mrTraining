package eventbus

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/innotechlabs01/mr-training-api/pkg/telemetry"
)

// Canonical domain event types published via the transactional outbox and NATS JetStream.
const (
	SubjectWorkoutStarted           = "workout.started"
	SubjectWorkoutCompleted         = "workout.completed"
	SubjectWorkoutProgress          = "workout.progress"
	SubjectWorkoutSetLogged         = "workout.set.logged"
	SubjectTemplateCreated          = "template.created"
	SubjectTemplateUpdated          = "template.updated"
	SubjectAssignmentCreated        = "assignment.created"
	SubjectPaymentApproved          = "payment.approved"
	SubjectPaymentFailed            = "payment.failed"
	SubjectSubscriptionActivated    = "subscription.activated"
	SubjectSubscriptionCancelled    = "subscription.cancelled"
	SubjectCheckoutPaid             = "checkout.paid"
	SubjectCheckoutFailed           = "checkout.failed"
	SubjectCheckoutClaimed          = "checkout.claimed"
	SubjectClerkMetadataSyncRequest = "clerk.metadata.sync_requested"
	SubjectClerkUserProvisioned     = "clerk.user.provisioned"
	SubjectNotificationRequested    = "notification.requested"
	SubjectSupportTicketCreated     = "support.ticket.created"
	SubjectSupportMessageAdded      = "support.message.added"
	SubjectErrorReported            = "error.reported"
	SubjectGarminSyncRequested      = "wearable.garmin.sync_requested"
	SubjectEarningsCommissioned     = "earnings.commission.accrued"
)

// DomainEvent is the canonical envelope persisted in PostgreSQL outbox and
// transported asynchronously over NATS JetStream / InMemoryBus.
type DomainEvent struct {
	EventID        string                 `json:"event_id"`
	EventVersion   int                    `json:"event_version"`
	EventType      string                 `json:"event_type"`
	AggregateType  string                 `json:"aggregate_type"`
	AggregateID    string                 `json:"aggregate_id"`
	CoachID        string                 `json:"coach_id,omitempty"`
	AthleteID      string                 `json:"athlete_id,omitempty"`
	OrganizationID string                 `json:"organization_id,omitempty"`
	CorrelationID  string                 `json:"correlation_id,omitempty"`
	CausationID    string                 `json:"causation_id,omitempty"`
	OccurredAt     time.Time              `json:"occurred_at"`
	Payload        map[string]interface{} `json:"payload"`
	Metadata       map[string]string      `json:"metadata,omitempty"`
}

// NewEvent builds a DomainEvent populated with UUIDv4 EventID, timestamp, and
// telemetry identifiers extracted from ctx.
func NewEvent(ctx context.Context, eventType, aggregateType, aggregateID string, payload map[string]interface{}) DomainEvent {
	if payload == nil {
		payload = map[string]interface{}{}
	}
	return DomainEvent{
		EventID:       uuid.New().String(),
		EventVersion:  1,
		EventType:     eventType,
		AggregateType: aggregateType,
		AggregateID:   aggregateID,
		CorrelationID: telemetry.CorrelationID(ctx),
		CausationID:   telemetry.CausationID(ctx),
		OccurredAt:    time.Now().UTC(),
		Payload:       payload,
		Metadata:      map[string]string{},
	}
}

// WithTenant returns a copy enriched with coach, athlete, and organization scopes.
func (e DomainEvent) WithTenant(coachID, athleteID, organizationID string) DomainEvent {
	if coachID != "" {
		e.CoachID = coachID
	}
	if athleteID != "" {
		e.AthleteID = athleteID
	}
	if organizationID != "" {
		e.OrganizationID = organizationID
	}
	return e
}
