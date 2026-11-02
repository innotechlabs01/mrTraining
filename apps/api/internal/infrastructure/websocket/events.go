// Package websocket provides realtime WebSocket connectivity for the MR Training API.
// It implements a hub-based pub/sub system for pushing events to connected clients.
package websocket

// Event type constants used in Message.Type to categorize realtime events.
const (
	EventTrainingUpdated     = "training.updated"
	EventNotificationCreated = "notification.created"
	EventMembershipUpdated   = "membership.updated"
	EventProgressUpdated     = "progress.updated"
	EventEventCreated        = "event.created"
	EventEventUpdated        = "event.updated"
)

// Event represents a domain event that can be pushed to WebSocket clients.
type Event struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}
