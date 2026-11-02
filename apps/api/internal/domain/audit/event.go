// Package audit defines the append-only financial audit trail used by the
// Alianzas module. Every covered mutation must persist its event in the same
// database transaction as the mutation itself, so that a failed audit write
// rolls the whole operation back (see review finding H-05).
package audit

import "encoding/json"

// Event is one immutable financial audit record. Entity/EntityID identify the
// affected row, Action is a short verb (e.g. "ally.created"), and Payload is an
// optional JSON document with the relevant field values.
type Event struct {
	ID        string `json:"id"`
	Entity    string `json:"entity"`
	EntityID  string `json:"entity_id"`
	Action    string `json:"action"`
	ActorID   string `json:"actor_id,omitempty"`
	ActorType string `json:"actor_type"` // user | system
	Payload   string `json:"payload,omitempty"`
	CreatedAt string `json:"created_at"`
}

// NewEvent builds an audit event with a JSON-encoded payload. A nil payload
// produces an empty payload string. The ID, timestamps and entity id are filled
// in by the persistence layer inside the writing transaction.
func NewEvent(entity, action, actorID string, payload map[string]any) Event {
	body := ""
	if payload != nil {
		if b, err := json.Marshal(payload); err == nil {
			body = string(b)
		}
	}
	return Event{
		Entity:    entity,
		Action:    action,
		ActorID:   actorID,
		ActorType: "user",
		Payload:   body,
	}
}
