package nats

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/pkg/telemetry"
)

type stubProcessedStore struct {
	mu   sync.Mutex
	seen map[string]bool
}

func newStubProcessedStore() *stubProcessedStore {
	return &stubProcessedStore{seen: make(map[string]bool)}
}

func (s *stubProcessedStore) IsProcessed(_ context.Context, consumerName, eventID string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.seen[consumerName+":"+eventID], nil
}

func (s *stubProcessedStore) MarkProcessed(_ context.Context, consumerName, eventID, _ string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seen[consumerName+":"+eventID] = true
	return nil
}

type stubDLQStore struct {
	mu      sync.Mutex
	records []eventbus.DeadLetterRecord
}

func (s *stubDLQStore) SaveDeadLetter(_ context.Context, rec eventbus.DeadLetterRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records = append(s.records, rec)
	return nil
}

type fakeMsgHandle struct {
	subject   string
	data      []byte
	headers   map[string]string
	delivered uint64
	acked     bool
	naked     bool
	termed    bool
	nakDelay  time.Duration
}

func (f *fakeMsgHandle) Subject() string            { return f.subject }
func (f *fakeMsgHandle) Data() []byte               { return f.data }
func (f *fakeMsgHandle) Header(key string) string   { return f.headers[key] }
func (f *fakeMsgHandle) DeliveredCount() uint64     { return f.delivered }
func (f *fakeMsgHandle) Ack() error                 { f.acked = true; return nil }
func (f *fakeMsgHandle) NakWithDelay(d time.Duration) error { f.naked = true; f.nakDelay = d; return nil }
func (f *fakeMsgHandle) Term() error                { f.termed = true; return nil }

func TestBuildNATSMessage_SetsDedupAndCorrelationHeaders(t *testing.T) {
	ctx := telemetry.WithCorrelationID(context.Background(), "corr-abc")
	ev := eventbus.NewEvent(ctx, eventbus.SubjectPaymentApproved, "subscription", "sub-1", map[string]interface{}{"ok": true})

	msg, err := BuildNATSMessage(ev)
	require.NoError(t, err)
	require.Equal(t, eventbus.SubjectPaymentApproved, msg.Subject)
	require.Equal(t, ev.EventID, msg.Header.Get(nats.MsgIdHdr))
	require.Equal(t, "corr-abc", msg.Header.Get("X-Correlation-ID"))
	require.Equal(t, eventbus.SubjectPaymentApproved, msg.Header.Get("X-Event-Type"))
}

func TestJetStreamBus_DeduplicatesProcessedEvent(t *testing.T) {
	proc := newStubProcessedStore()
	dlq := &stubDLQStore{}
	bus := NewJetStreamBus(nil, proc, dlq, zap.NewNop())

	ev := eventbus.NewEvent(telemetry.WithCorrelationID(context.Background(), "c-1"), eventbus.SubjectPaymentApproved, "sub", "s1", nil)
	raw, _ := json.Marshal(ev)

	calls := 0
	handler := func(ctx context.Context, got eventbus.DomainEvent) error {
		calls++
		require.Equal(t, "c-1", telemetry.CorrelationID(ctx))
		return nil
	}

	h1 := &fakeMsgHandle{subject: ev.EventType, data: raw, delivered: 1}
	bus.handleNATSMsg(context.Background(), "billing-consumer", nil, h1, handler)
	require.True(t, h1.acked)
	require.Equal(t, 1, calls)

	// Second delivery with identical EventID should Ack without calling handler
	h2 := &fakeMsgHandle{subject: ev.EventType, data: raw, delivered: 2}
	bus.handleNATSMsg(context.Background(), "billing-consumer", nil, h2, handler)
	require.True(t, h2.acked)
	require.Equal(t, 1, calls)
}

func TestJetStreamBus_RetriesThenRoutesToDLQOnMaxDeliver(t *testing.T) {
	proc := newStubProcessedStore()
	dlq := &stubDLQStore{}
	bus := NewJetStreamBus(nil, proc, dlq, zap.NewNop())

	ev := eventbus.NewEvent(context.Background(), eventbus.SubjectErrorReported, "error", "e1", map[string]interface{}{"msg": "boom"})
	raw, _ := json.Marshal(ev)

	handler := func(context.Context, eventbus.DomainEvent) error {
		return errors.New("temporary downstream failure")
	}

	// Attempt 1 -> NakWithDelay
	h1 := &fakeMsgHandle{subject: ev.EventType, data: raw, delivered: 1}
	bus.handleNATSMsg(context.Background(), "discord-consumer", nil, h1, handler)
	require.True(t, h1.naked)
	require.False(t, h1.termed)
	require.Empty(t, dlq.records)

	// Attempt 5 (MaxDeliver) -> Term + save DLQ record
	h5 := &fakeMsgHandle{subject: ev.EventType, data: raw, delivered: 5}
	bus.handleNATSMsg(context.Background(), "discord-consumer", nil, h5, handler)
	require.True(t, h5.termed)
	require.Len(t, dlq.records, 1)
	require.Equal(t, "discord-consumer", dlq.records[0].ConsumerName)
	require.Equal(t, ev.EventID, dlq.records[0].EventID)
}
