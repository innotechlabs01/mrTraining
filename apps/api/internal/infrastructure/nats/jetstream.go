// Package nats provides the NATS JetStream infrastructure for the MR Training
// API. It connects to NATS, ensures persistent streams exist, and offers a
// reusable durable-consumer subscription helper used by background event
// consumers (e.g. the athlete.session.* session projector).
//
// NATS is the asynchronous communication backbone (see
// apps/rules/05-backend-architecture.md §9). JetStream provides persistence,
// at-least-once delivery and durable consumer groups for horizontal scaling.
package nats

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

// ackWait is how long JetStream waits for an ack before redelivering.
const ackWait = 30 * time.Second

// Connect establishes a NATS connection and returns the connection together
// with its JetStream context. The connection is configured for resilient
// operation: indefinite reconnects with a short backoff, and a bounded
// JetStream request timeout so callers never block indefinitely.
func Connect(url string) (*nats.Conn, nats.JetStreamContext, error) {
	nc, err := nats.Connect(url,
		nats.Name("mr-training-api"),
		nats.ReconnectWait(2*time.Second),
		nats.MaxReconnects(-1),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("connect to nats: %w", err)
	}

	js, err := nc.JetStream(nats.MaxWait(10 * time.Second))
	if err != nil {
		nc.Close()
		return nil, nil, fmt.Errorf("jetstream context: %w", err)
	}

	return nc, js, nil
}

// EnsureStream creates a JetStream stream if it does not already exist.
// Subjects are the wildcard subjects the stream consumes. Limits retention
// keeps the stream bounded by message count and age.
func EnsureStream(ctx context.Context, js nats.JetStreamContext, name string, subjects []string) error {
	_, err := js.AddStream(&nats.StreamConfig{
		Name:     name,
		Subjects: subjects,
		Retention: nats.LimitsPolicy,
		MaxMsgs:   100000,
		MaxAge:    24 * time.Hour,
	})
	if err != nil && !isStreamAlreadyExists(err) {
		return fmt.Errorf("add stream %q: %w", name, err)
	}
	return nil
}

// isStreamAlreadyExists reports whether err is the JetStream "stream name
// already in use" error, which means the stream was created by another
// instance and we can safely proceed.
func isStreamAlreadyExists(err error) bool {
	var jsErr nats.JetStreamError
	if errors.As(err, &jsErr) {
		if apiErr := jsErr.APIError(); apiErr != nil {
			return apiErr.ErrorCode == nats.JSErrCodeStreamNameInUse
		}
	}
	return false
}

// SubscribeDurable creates a durable sync subscription bound to stream and
// delivers each message to handler until ctx is cancelled. It uses manual
// acknowledgment so the handler can ack only after its work (e.g. a database
// write) succeeds, giving at-least-once delivery with idempotent writes. The
// returned subscription should be kept alive for the process lifetime; it is
// drained when ctx is cancelled.
func SubscribeDurable(
	ctx context.Context,
	js nats.JetStreamContext,
	stream, subject, durable string,
	handler func(msg *nats.Msg),
) (*nats.Subscription, error) {
	sub, err := js.SubscribeSync(subject,
		nats.Durable(durable),
		nats.ManualAck(),
		nats.AckWait(ackWait),
		nats.BindStream(stream),
		nats.DeliverAll(),
	)
	if err != nil {
		return nil, fmt.Errorf("subscribe %q durable %q: %w", subject, durable, err)
	}

	go func() {
		defer sub.Drain()
		for {
			msg, err := sub.NextMsgWithContext(ctx)
			if err != nil {
				if errors.Is(err, context.Canceled) {
					return
				}
				continue
			}
			handler(msg)
		}
	}()

	return sub, nil
}
