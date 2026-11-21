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

// Hub is the in-memory broadcast hub for live running events, with an optional
// distributed broadcaster hook for multi-replica SSE delivery.
type Hub struct {
	mu       sync.RWMutex
	subs     map[string][]chan Event // workoutID -> subscriber channels
	nextID   int
	external func(Event)
}

// NewHub creates a live-running event hub.
func NewHub() *Hub {
	return &Hub{
		subs: make(map[string][]chan Event),
	}
}

// SetExternalBroadcaster registers a callback invoked on local Publish calls
// to replicate live events across cluster nodes.
func (h *Hub) SetExternalBroadcaster(fn func(Event)) {
	h.mu.Lock()
	h.external = fn
	h.mu.Unlock()
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

// Publish sends an event to all subscribers of workoutID and forwards to any
// registered distributed broadcaster. Non-blocking.
func (h *Hub) Publish(ev Event) {
	ev.Timestamp = now()
	h.deliverLocal(ev)

	h.mu.RLock()
	ext := h.external
	h.mu.RUnlock()
	if ext != nil {
		ext(ev)
	}
}

// PublishLocal delivers ev only to subscribers connected to this instance
// (used by distributed realtime bridges to prevent echo loops).
func (h *Hub) PublishLocal(ev Event) {
	if ev.Timestamp == "" {
		ev.Timestamp = now()
	}
	h.deliverLocal(ev)
}

func (h *Hub) deliverLocal(ev Event) {
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
