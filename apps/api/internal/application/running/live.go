// Package running provides a lightweight in-memory SSE hub for live
// running-workout progress. It is transport-agnostic: any handler can
// publish events and any HTTP handler can expose them as Server-Sent Events.
//
// Design notes:
//   - Zero external dependencies: pure sync.Map + channels.
//   - Non-destructive: it only adds new endpoints; existing handlers are
//     untouched except CompleteRunningWorkout which now also publishes a
//     workout.completed event.
//   - Each subscriber gets its own buffered channel (cap 8) so a slow
//     consumer never blocks the publisher or other subscribers.
//   - Subscriptions are keyed by workoutID so a coach only receives events
//     for workouts he owns (ownership is enforced in the SSE handler).
package running

import (
	"sync"
	"time"
)

// Event is a single live-running event pushed to SSE subscribers.
type Event struct {
	// WorkoutID is the assigned workout this event belongs to.
	WorkoutID string `json:"workoutId"`
	// Type is one of: workout.started, workout.progress, workout.completed.
	Type string `json:"type"`
	// Payload carries event-specific data (interval index, elapsed seconds,
	// distance km, completed flag, etc.).
	Payload map[string]interface{} `json:"payload,omitempty"`
	// Timestamp is RFC3339 UTC.
	Timestamp string `json:"timestamp"`
}

// Hub is the in-memory broadcast hub for live running events.
type Hub struct {
	mu     sync.RWMutex
	subs   map[string][]chan Event // workoutID -> subscriber channels
	nextID int
}

// NewHub creates a live-running event hub.
func NewHub() *Hub {
	return &Hub{
		subs: make(map[string][]chan Event),
	}
}

// DefaultHub is the process-wide singleton used by HTTP handlers.
// It is initialized lazily on first access.
var DefaultHub = NewHub()

// now returns an RFC3339 UTC timestamp.
func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

// Subscribe registers a channel to receive events for the given workoutID.
// The returned channel is buffered so slow consumers don't block publishers.
func (h *Hub) Subscribe(workoutID string) chan Event {
	h.mu.Lock()
	defer h.mu.Unlock()
	ch := make(chan Event, 8)
	h.subs[workoutID] = append(h.subs[workoutID], ch)
	return ch
}

// Unsubscribe removes a subscriber channel for the given workoutID.
func (h *Hub) Unsubscribe(workoutID string, ch chan Event) {
	h.mu.Lock()
	defer h.mu.Unlock()
	chans := h.subs[workoutID]
	for i, c := range chans {
		if c == ch {
			h.subs[workoutID] = append(chans[:i], chans[i+1:]...)
			close(ch)
			break
		}
	}
	if len(h.subs[workoutID]) == 0 {
		delete(h.subs, workoutID)
	}
}

// Publish sends an event to all subscribers of workoutID. Non-blocking:
// if a subscriber's channel is full, the event is dropped for that
// subscriber only (never blocks the publisher or others).
func (h *Hub) Publish(ev Event) {
	ev.Timestamp = now()
	h.mu.RLock()
	chans := h.subs[ev.WorkoutID]
	h.mu.RUnlock()
	for _, ch := range chans {
		select {
		case ch <- ev:
		default:
			// drop for this subscriber only
		}
	}
}
