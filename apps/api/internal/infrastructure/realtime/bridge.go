package realtime

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	ws "github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
)

const (
	wsSubjectPrefix  = "rt.ws."
	sseSubjectPrefix = "rt.sse."
)

type wsEnvelope struct {
	OriginNodeID string     `json:"origin_node_id"`
	Topic        string     `json:"topic,omitempty"`
	UserIDs      []string   `json:"user_ids,omitempty"`
	Message      ws.Message `json:"message"`
}

type sseEnvelope struct {
	OriginNodeID string           `json:"origin_node_id"`
	Event        runningapp.Event `json:"event"`
}

// Bridge replicates WebSocket and SSE live events across multiple API pods using
// NATS Core fanout while suppressing self-originated echoes via OriginNodeID.
type Bridge struct {
	nodeID string
	nc     *nats.Conn
	wsHub  *ws.Hub
	sseHub *runningapp.Hub
	log    *zap.Logger

	mu   sync.Mutex
	subs []*nats.Subscription
}

// NewBridge constructs a distributed realtime bridge for wsHub and sseHub.
func NewBridge(nc *nats.Conn, wsHub *ws.Hub, sseHub *runningapp.Hub, log *zap.Logger) *Bridge {
	if log == nil {
		log = zap.NewNop()
	}
	return &Bridge{
		nodeID: uuid.New().String(),
		nc:     nc,
		wsHub:  wsHub,
		sseHub: sseHub,
		log:    log,
	}
}

// NodeID returns this replica's unique origin identifier.
func (b *Bridge) NodeID() string {
	return b.nodeID
}

// Start subscribes to NATS Core realtime topics and hooks outbound local broadcasts.
func (b *Bridge) Start(ctx context.Context) error {
	if b.wsHub != nil {
		b.wsHub.SetExternalBroadcaster(b.publishWS)
	}
	if b.sseHub != nil {
		b.sseHub.SetExternalBroadcaster(b.publishSSE)
	}

	if b.nc == nil {
		return nil
	}

	wsSub, err := b.nc.Subscribe(wsSubjectPrefix+">", func(m *nats.Msg) {
		b.HandleWSBytes(m.Data)
	})
	if err != nil {
		return fmt.Errorf("subscribe %s>: %w", wsSubjectPrefix, err)
	}

	sseSub, err := b.nc.Subscribe(sseSubjectPrefix+">", func(m *nats.Msg) {
		b.HandleSSEBytes(m.Data)
	})
	if err != nil {
		_ = wsSub.Unsubscribe()
		return fmt.Errorf("subscribe %s>: %w", sseSubjectPrefix, err)
	}

	b.mu.Lock()
	b.subs = append(b.subs, wsSub, sseSub)
	b.mu.Unlock()

	if ctx != nil {
		go func() {
			<-ctx.Done()
			b.Stop()
		}()
	}
	return nil
}

// Stop detaches subscriptions and clears hub hooks.
func (b *Bridge) Stop() {
	b.mu.Lock()
	subs := append([]*nats.Subscription(nil), b.subs...)
	b.subs = nil
	b.mu.Unlock()

	for _, s := range subs {
		_ = s.Drain()
	}
}

func (b *Bridge) publishWS(topic string, userIDs []string, msg ws.Message) {
	if b.nc == nil {
		return
	}
	env := wsEnvelope{
		OriginNodeID: b.nodeID,
		Topic:        topic,
		UserIDs:      userIDs,
		Message:      msg,
	}
	raw, err := json.Marshal(env)
	if err != nil {
		return
	}
	subj := wsSubjectPrefix + "broadcast"
	if topic != "" {
		subj = wsSubjectPrefix + "topic"
	} else if len(userIDs) > 0 {
		subj = wsSubjectPrefix + "user"
	}
	_ = b.nc.Publish(subj, raw)
}

func (b *Bridge) publishSSE(ev runningapp.Event) {
	if b.nc == nil {
		return
	}
	raw, err := json.Marshal(sseEnvelope{
		OriginNodeID: b.nodeID,
		Event:        ev,
	})
	if err != nil {
		return
	}
	_ = b.nc.Publish(sseSubjectPrefix+"workout", raw)
}

// HandleWSBytes processes a serialized remote WS envelope, ignoring same-node echoes.
func (b *Bridge) HandleWSBytes(data []byte) {
	var env wsEnvelope
	if err := json.Unmarshal(data, &env); err != nil {
		b.log.Warn("invalid ws bridge payload", zap.Error(err))
		return
	}
	if env.OriginNodeID == b.nodeID || b.wsHub == nil {
		return
	}
	if env.Topic != "" {
		b.wsHub.BroadcastToTopicLocal(env.Topic, env.Message)
		return
	}
	if len(env.UserIDs) > 0 {
		for _, uid := range env.UserIDs {
			b.wsHub.SendToUserLocal(uid, env.Message)
		}
		return
	}
	b.wsHub.BroadcastLocal(env.Message)
}

// HandleSSEBytes processes a serialized remote SSE envelope, ignoring same-node echoes.
func (b *Bridge) HandleSSEBytes(data []byte) {
	var env sseEnvelope
	if err := json.Unmarshal(data, &env); err != nil {
		b.log.Warn("invalid sse bridge payload", zap.Error(err))
		return
	}
	if env.OriginNodeID == b.nodeID || b.sseHub == nil {
		return
	}
	b.sseHub.PublishLocal(env.Event)
}

// RouteOutboxEventToLocalHubs translates legacy outbox domain events into SSE
// (`running.DefaultHub`) and optional WebSocket (`wsHub`) broadcasts.
func RouteOutboxEventToLocalHubs(sseHub *runningapp.Hub, wsHub *ws.Hub, ev eventbus.DomainEvent) {
	ts := ev.OccurredAt
	if ts.IsZero() {
		ts = time.Now().UTC()
	}
	if sseHub != nil {
		rtEv := runningapp.Event{
			Type:      ev.EventType,
			Payload:   ev.Payload,
			Timestamp: ts.Format(time.RFC3339),
		}
		switch ev.EventType {
		case eventbus.SubjectWorkoutProgress, "workout.connected":
			rtEv.WorkoutID = ev.AggregateID
			sseHub.Publish(rtEv)
		case eventbus.SubjectWorkoutStarted, eventbus.SubjectWorkoutCompleted:
			if ev.CoachID != "" {
				rtEv.WorkoutID = ev.CoachID
				sseHub.Publish(rtEv)
			}
			if ev.AthleteID != "" {
				e2 := rtEv
				e2.WorkoutID = ev.AthleteID
				sseHub.Publish(e2)
			}
		case eventbus.SubjectTemplateCreated, eventbus.SubjectTemplateUpdated:
			if ev.CoachID != "" {
				rtEv.WorkoutID = ev.CoachID
				sseHub.Publish(rtEv)
			}
		case eventbus.SubjectAssignmentCreated:
			if ev.AthleteID != "" {
				rtEv.WorkoutID = ev.AthleteID
				sseHub.Publish(rtEv)
			}
			if ev.CoachID != "" {
				e2 := rtEv
				e2.WorkoutID = ev.CoachID
				sseHub.Publish(e2)
			}
		default:
			target := ev.AggregateID
			if ev.CoachID != "" {
				target = ev.CoachID
			} else if ev.AthleteID != "" {
				target = ev.AthleteID
			}
			if target != "" {
				rtEv.WorkoutID = target
				sseHub.Publish(rtEv)
			}
		}
	}

	if wsHub != nil {
		wsMsg := ws.Message{
			Type:    ev.EventType,
			Payload: ev.Payload,
		}
		if ev.CoachID != "" {
			wsHub.SendToUser(ev.CoachID, wsMsg)
		}
		if ev.AthleteID != "" && ev.AthleteID != ev.CoachID {
			wsHub.SendToUser(ev.AthleteID, wsMsg)
		}
	}
}
