package nats

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/pkg/metrics"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
	"github.com/innotechlabs01/mr-training-api/pkg/telemetry"
)

const (
	// DomainStream is the JetStream stream persisting domain events from the transactional outbox.
	DomainStream = "MR_EVENTS"
	// DLQStream is the JetStream stream capturing terminal event failures for audit and replay.
	DLQStream = "MR_DLQ"

	defaultMaxDeliver = 5
)

var DomainStreamSubjects = []string{
	"workout.>",
	"template.>",
	"assignment.>",
	"payment.>",
	"subscription.>",
	"checkout.>",
	"clerk.>",
	"notification.>",
	"support.>",
	"error.>",
	"wearable.>",
	"earnings.>",
}

// EnsureDomainStreams idempotently provisions MR_EVENTS and MR_DLQ JetStream streams.
func EnsureDomainStreams(ctx context.Context, js nats.JetStreamContext) error {
	if js == nil {
		return fmt.Errorf("jetstream context is nil")
	}
	_, err := js.AddStream(&nats.StreamConfig{
		Name:       DomainStream,
		Subjects:   DomainStreamSubjects,
		Retention:  nats.LimitsPolicy,
		MaxMsgs:    500000,
		MaxAge:     7 * 24 * time.Hour,
		Duplicates: 2 * time.Minute,
	}, nats.Context(ctx))
	if err != nil && !isStreamAlreadyExists(err) {
		return fmt.Errorf("ensure stream %s: %w", DomainStream, err)
	}

	_, err = js.AddStream(&nats.StreamConfig{
		Name:      DLQStream,
		Subjects:  []string{"dlq.>"},
		Retention: nats.LimitsPolicy,
		MaxMsgs:   250000,
		MaxAge:    30 * 24 * time.Hour,
	}, nats.Context(ctx))
	if err != nil && !isStreamAlreadyExists(err) {
		return fmt.Errorf("ensure stream %s: %w", DLQStream, err)
	}
	return nil
}

// JetStreamBus implements eventbus.Publisher and eventbus.Subscriber over NATS JetStream
// with dedup headers, durable queue groups, retries, circuit breaking, and DLQ routing.
type JetStreamBus struct {
	js        nats.JetStreamContext
	processed eventbus.ProcessedEventStore
	dlq       eventbus.DeadLetterStore
	breaker   *resilience.CircuitBreaker
	log       *zap.Logger
	maxDeliv  uint64
}

// NewJetStreamBus builds a JetStream-backed domain event bus.
func NewJetStreamBus(
	js nats.JetStreamContext,
	processed eventbus.ProcessedEventStore,
	dlq eventbus.DeadLetterStore,
	log *zap.Logger,
) *JetStreamBus {
	if log == nil {
		log = zap.NewNop()
	}
	return &JetStreamBus{
		js:        js,
		processed: processed,
		dlq:       dlq,
		breaker: resilience.RegisterBreaker(resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{
			Name:             "nats_publish",
			FailureThreshold: 5,
			ResetTimeout:     15 * time.Second,
		})),
		log:      log,
		maxDeliv: defaultMaxDeliver,
	}
}

// Publish publishes event to JetStream with deduplication and correlation headers.
func (b *JetStreamBus) Publish(ctx context.Context, event eventbus.DomainEvent) error {
	if b == nil || b.js == nil {
		return fmt.Errorf("nats jetstream not connected")
	}
	msg, err := BuildNATSMessage(event)
	if err != nil {
		return err
	}
	return b.breaker.Execute(ctx, func(cbCtx context.Context) error {
		pubCtx, cancel := context.WithTimeout(cbCtx, 5*time.Second)
		defer cancel()
		_, perr := b.js.PublishMsg(msg, nats.Context(pubCtx))
		return perr
	})
}

// BuildNATSMessage converts a DomainEvent into a NATS message carrying de-duplication
// and distributed tracing headers.
func BuildNATSMessage(event eventbus.DomainEvent) (*nats.Msg, error) {
	body, err := json.Marshal(event)
	if err != nil {
		return nil, fmt.Errorf("marshal domain event: %w", err)
	}
	msg := nats.NewMsg(event.EventType)
	msg.Data = body
	msg.Header = nats.Header{}
	if event.EventID != "" {
		msg.Header.Set(nats.MsgIdHdr, event.EventID)
	}
	if event.CorrelationID != "" {
		msg.Header.Set("X-Correlation-ID", event.CorrelationID)
	}
	msg.Header.Set("X-Event-Type", event.EventType)
	return msg, nil
}

type jetStreamSub struct {
	sub *nats.Subscription
}

func (s *jetStreamSub) Unsubscribe() error {
	if s == nil || s.sub == nil {
		return nil
	}
	return s.sub.Drain()
}

// Subscribe creates a durable queue-group subscription bound to MR_EVENTS.
func (b *JetStreamBus) Subscribe(ctx context.Context, durableName, subject string, handler eventbus.Handler) (eventbus.Subscription, error) {
	if b == nil || b.js == nil {
		return nil, fmt.Errorf("nats jetstream not connected")
	}
	sub, err := b.js.QueueSubscribe(
		subject,
		durableName,
		func(msg *nats.Msg) {
			b.handleNATSMsg(ctx, durableName, msg, &natsMsgHandle{msg: msg}, handler)
		},
		nats.Durable(durableName),
		nats.ManualAck(),
		nats.AckWait(ackWait),
		nats.MaxDeliver(int(b.maxDeliv)),
		nats.BindStream(DomainStream),
	)
	if err != nil {
		return nil, fmt.Errorf("jetstream queue subscribe (%s/%s): %w", durableName, subject, err)
	}

	if ctx != nil {
		go func() {
			<-ctx.Done()
			_ = sub.Drain()
		}()
	}
	return &jetStreamSub{sub: sub}, nil
}

type msgHandle interface {
	Subject() string
	Data() []byte
	Header(key string) string
	DeliveredCount() uint64
	Ack() error
	NakWithDelay(delay time.Duration) error
	Term() error
}

type natsMsgHandle struct {
	msg *nats.Msg
}

func (h *natsMsgHandle) Subject() string            { return h.msg.Subject }
func (h *natsMsgHandle) Data() []byte               { return h.msg.Data }
func (h *natsMsgHandle) Header(key string) string   { return h.msg.Header.Get(key) }
func (h *natsMsgHandle) Ack() error                 { return h.msg.Ack() }
func (h *natsMsgHandle) NakWithDelay(d time.Duration) error { return h.msg.NakWithDelay(d) }
func (h *natsMsgHandle) Term() error                { return h.msg.Term() }
func (h *natsMsgHandle) DeliveredCount() uint64 {
	md, err := h.msg.Metadata()
	if err != nil || md == nil {
		return 1
	}
	return md.NumDelivered
}

func (b *JetStreamBus) handleNATSMsg(parent context.Context, durableName string, raw *nats.Msg, handle msgHandle, handler eventbus.Handler) {
	start := time.Now()
	subj := handle.Subject()

	var ev eventbus.DomainEvent
	if err := json.Unmarshal(handle.Data(), &ev); err != nil {
		b.log.Error("invalid domain event JSON, moving to DLQ",
			zap.String("consumer", durableName),
			zap.String("subject", subj),
			zap.Error(err))
		b.sendToDLQ(parent, durableName, subj, handle.Data(), ev, err, int(handle.DeliveredCount()))
		metrics.NATSConsumerMessagesTotal.Inc(subj, "dlq_parse_error")
		_ = handle.Term()
		return
	}
	if ev.EventType == "" {
		ev.EventType = subj
	}
	if ev.CorrelationID == "" {
		ev.CorrelationID = handle.Header("X-Correlation-ID")
	}

	baseCtx := parent
	if baseCtx == nil {
		baseCtx = context.Background()
	}
	execCtx, cancel := context.WithTimeout(telemetry.WithCorrelationID(baseCtx, ev.CorrelationID), 25*time.Second)
	defer cancel()

	if b.processed != nil && ev.EventID != "" {
		done, err := b.processed.IsProcessed(execCtx, durableName, ev.EventID)
		if err != nil {
			b.log.Warn("processed check failed, proceeding cautiously", zap.Error(err))
		} else if done {
			metrics.NATSConsumerMessagesTotal.Inc(subj, "dedup_skipped")
			_ = handle.Ack()
			return
		}
	}

	err := handler(execCtx, ev)
	metrics.NATSConsumerDurationSeconds.Observe(time.Since(start).Seconds(), subj)

	if err == nil {
		if b.processed != nil && ev.EventID != "" {
			if merr := b.processed.MarkProcessed(execCtx, durableName, ev.EventID, subj); merr != nil {
				b.log.Warn("failed marking processed event, nak for retry",
					zap.String("consumer", durableName),
					zap.String("event_id", ev.EventID),
					zap.Error(merr))
				metrics.NATSConsumerMessagesTotal.Inc(subj, "mark_error")
				_ = handle.NakWithDelay(2 * time.Second)
				return
			}
		}
		metrics.NATSConsumerMessagesTotal.Inc(subj, "ok")
		_ = handle.Ack()
		return
	}

	delivered := handle.DeliveredCount()
	nonRetryable := resilience.IsNonRetryable(err)
	if nonRetryable || delivered >= b.maxDeliv {
		b.log.Error("event exhausted retries or non-retryable, routing to DLQ",
			zap.String("consumer", durableName),
			zap.String("subject", subj),
			zap.String("event_id", ev.EventID),
			zap.Uint64("delivered", delivered),
			zap.Error(err))
		b.sendToDLQ(baseCtx, durableName, subj, handle.Data(), ev, err, int(delivered))
		metrics.NATSConsumerMessagesTotal.Inc(subj, "dlq")
		_ = handle.Term()
		return
	}

	delay := retryBackoff(int(delivered))
	metrics.NATSConsumerMessagesTotal.Inc(subj, "retry")
	_ = handle.NakWithDelay(delay)
}

func (b *JetStreamBus) sendToDLQ(ctx context.Context, consumerName, subject string, rawData []byte, ev eventbus.DomainEvent, cause error, attempts int) {
	errMsg := "unknown error"
	if cause != nil {
		errMsg = cause.Error()
	}
	if b.dlq != nil {
		saveCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		_ = b.dlq.SaveDeadLetter(saveCtx, eventbus.DeadLetterRecord{
			StreamName:    DomainStream,
			Subject:       subject,
			ConsumerName:  consumerName,
			EventID:       ev.EventID,
			EventType:     ev.EventType,
			CorrelationID: ev.CorrelationID,
			Payload:       rawData,
			ErrorMessage:  errMsg,
			Attempts:      attempts,
		})
		cancel()
	}
	if b.js != nil {
		dlqMsg := nats.NewMsg("dlq." + subject)
		dlqMsg.Data = rawData
		dlqMsg.Header = nats.Header{}
		dlqMsg.Header.Set("X-DLQ-Consumer", consumerName)
		dlqMsg.Header.Set("X-DLQ-Error", errMsg)
		if ev.EventID != "" {
			dlqMsg.Header.Set("X-Origin-Event-ID", ev.EventID)
		}
		pubCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		_, _ = b.js.PublishMsg(dlqMsg, nats.Context(pubCtx))
		cancel()
	}
}

func retryBackoff(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 6 {
		attempt = 6
	}
	return time.Duration(1<<uint(attempt)) * time.Second
}

// Compile-time interface check (using *nats.ErrConnectionClosed ref cleanly)
var _ = errors.Is
