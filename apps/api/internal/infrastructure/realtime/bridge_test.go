package realtime

import (
	"encoding/json"
	"testing"
	"time"

	"go.uber.org/zap"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	ws "github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
)

func TestBridge_SuppressesSelfEchoAndRelaysRemoteSSE(t *testing.T) {
	sseHub := runningapp.NewHub()
	ch := sseHub.Subscribe("w-1")
	defer sseHub.Unsubscribe("w-1", ch)

	bridge := NewBridge(nil, nil, sseHub, zap.NewNop())

	// Same origin -> must be ignored
	selfPayload, _ := json.Marshal(sseEnvelope{
		OriginNodeID: bridge.NodeID(),
		Event:        runningapp.Event{WorkoutID: "w-1", Type: "workout.progress"},
	})
	bridge.HandleSSEBytes(selfPayload)

	select {
	case ev := <-ch:
		t.Fatalf("expected self echo suppressed, received %+v", ev)
	case <-time.After(30 * time.Millisecond):
	}

	// Remote node -> delivered locally without triggering external loop
	extCalled := false
	sseHub.SetExternalBroadcaster(func(runningapp.Event) { extCalled = true })
	remotePayload, _ := json.Marshal(sseEnvelope{
		OriginNodeID: "other-pod-uuid",
		Event:        runningapp.Event{WorkoutID: "w-1", Type: "workout.progress"},
	})
	bridge.HandleSSEBytes(remotePayload)

	select {
	case ev := <-ch:
		if ev.Type != "workout.progress" {
			t.Fatalf("unexpected event type: %s", ev.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("expected remote SSE delivery")
	}
	if extCalled {
		t.Fatal("remote delivery must use PublishLocal and never re-emit externally")
	}
}

func TestRouteOutboxEventToLocalHubs_DeliversRunningSSE(t *testing.T) {
	sseHub := runningapp.NewHub()
	wsHub := ws.NewHub()
	ch := sseHub.Subscribe("coach-1")
	defer sseHub.Unsubscribe("coach-1", ch)

	RouteOutboxEventToLocalHubs(sseHub, wsHub, eventbus.DomainEvent{
		EventType:   eventbus.SubjectWorkoutCompleted,
		AggregateID: "sess-1",
		CoachID:     "coach-1",
		Payload:     map[string]interface{}{"distance_km": 10.2},
	})

	select {
	case ev := <-ch:
		if ev.Type != eventbus.SubjectWorkoutCompleted {
			t.Fatalf("unexpected type: %s", ev.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("expected outbox route to SSE hub")
	}
}
