package eventbus

import (
	"context"
	"database/sql"
	"encoding/json"
	"math/rand"
	"time"

	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/pkg/metrics"
	"github.com/innotechlabs01/mr-training-api/pkg/telemetry"
)

// Relay polls the transactional outbox using FOR UPDATE SKIP LOCKED leases,
// delivers events to a Publisher (typically NATS JetStream) and optional local
// realtime hooks, and moves permanent failures to dead_letter_events.
type Relay struct {
	db             *sql.DB
	publisher      Publisher
	dlq            DeadLetterStore
	realtimeHook   func(ctx context.Context, ev DomainEvent)
	logger         *zap.Logger
	workerID       string
	pollInterval   time.Duration
	batchSize      int
	maxAttempts    int
	leaseDuration  time.Duration
}

// NewRelay constructs a domain outbox relay worker.
func NewRelay(db *sql.DB, publisher Publisher, logger *zap.Logger) *Relay {
	if logger == nil {
		logger = zap.NewNop()
	}
	return &Relay{
		db:            db,
		publisher:     publisher,
		dlq:           NewSQLDeadLetterStore(db),
		logger:        logger,
		workerID:      "outbox-relay",
		pollInterval:  250 * time.Millisecond,
		batchSize:     100,
		maxAttempts:   10,
		leaseDuration: 30 * time.Second,
	}
}

// WithRealtimeHook attaches a hook called alongside broker publication (for in-process SSE/WS fallback).
func (r *Relay) WithRealtimeHook(fn func(ctx context.Context, ev DomainEvent)) *Relay {
	r.realtimeHook = fn
	return r
}

// WithDeadLetterStore overrides the DLQ persistence store.
func (r *Relay) WithDeadLetterStore(dlq DeadLetterStore) *Relay {
	if dlq != nil {
		r.dlq = dlq
	}
	return r
}

// Start runs the relay loop until ctx is cancelled.
func (r *Relay) Start(ctx context.Context) error {
	ticker := time.NewTicker(r.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := r.recoverExpired(ctx); err != nil {
				r.logger.Error("outbox relay recover failed", zap.Error(err))
			}
			if err := r.processBatch(ctx); err != nil {
				r.logger.Error("outbox relay batch failed", zap.Error(err))
			}
		}
	}
}

func (r *Relay) recoverExpired(ctx context.Context) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, "SELECT set_config('app.internal_execution_context', 'system_worker', true)"); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE outbox
		SET status = 'pending', locked_by = NULL, locked_until = NULL
		WHERE status = 'processing'
		  AND locked_until IS NOT NULL
		  AND locked_until < NOW()
	`); err != nil {
		return err
	}
	return tx.Commit()
}

type claimedOutboxRow struct {
	id            string
	eventID       string
	eventVersion  int
	eventType     string
	aggregateType string
	aggregateID   string
	coachID       sql.NullString
	athleteID     sql.NullString
	orgID         sql.NullString
	correlationID sql.NullString
	causationID   sql.NullString
	payload       []byte
	metadata      []byte
	occurredAt    time.Time
	attempts      int
}

func (r *Relay) processBatch(ctx context.Context) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, "SELECT set_config('app.internal_execution_context', 'system_worker', true)"); err != nil {
		return err
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT
			id,
			COALESCE(event_id::text, id::text),
			COALESCE(event_version, 1),
			event_type,
			aggregate_type,
			aggregate_id,
			coach_id,
			athlete_id,
			organization_id,
			correlation_id,
			causation_id,
			payload,
			COALESCE(metadata, '{}'::jsonb),
			occurred_at,
			attempts
		FROM outbox
		WHERE status = 'pending'
		  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		  AND (locked_until IS NULL OR locked_until < NOW())
		ORDER BY occurred_at ASC
		FOR UPDATE SKIP LOCKED
		LIMIT $1
	`, r.batchSize)
	if err != nil {
		return err
	}
	defer rows.Close()

	var items []claimedOutboxRow
	for rows.Next() {
		var it claimedOutboxRow
		if scanErr := rows.Scan(
			&it.id,
			&it.eventID,
			&it.eventVersion,
			&it.eventType,
			&it.aggregateType,
			&it.aggregateID,
			&it.coachID,
			&it.athleteID,
			&it.orgID,
			&it.correlationID,
			&it.causationID,
			&it.payload,
			&it.metadata,
			&it.occurredAt,
			&it.attempts,
		); scanErr != nil {
			return scanErr
		}
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(items) == 0 {
		return tx.Commit()
	}

	leaseUntil := time.Now().UTC().Add(r.leaseDuration)
	for _, it := range items {
		if _, err := tx.ExecContext(ctx, `
			UPDATE outbox SET status = 'processing', locked_by = $1, locked_until = $2
			WHERE id = $3 AND status = 'pending'
		`, r.workerID, leaseUntil, it.id); err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}

	metrics.OutboxPendingGauge.Set(float64(len(items)))

	for _, it := range items {
		ev := r.rowToEvent(it)
		pubCtx := telemetry.WithCorrelationID(ctx, ev.CorrelationID)
		if r.realtimeHook != nil {
			r.realtimeHook(pubCtx, ev)
		}

		var pubErr error
		if r.publisher != nil {
			pubErr = r.publisher.Publish(pubCtx, ev)
		}
		if pubErr == nil {
			if err := r.markPublished(ctx, it.id, it.attempts+1); err != nil {
				r.logger.Error("failed marking outbox event published", zap.String("outbox_id", it.id), zap.Error(err))
			} else {
				metrics.OutboxEventsPublishedTotal.Inc(it.eventType, "published")
			}
			continue
		}

		nextAttempt := it.attempts + 1
		if nextAttempt >= r.maxAttempts {
			if err := r.markDead(ctx, it, ev, nextAttempt, pubErr.Error()); err != nil {
				r.logger.Error("failed marking outbox event dead", zap.String("outbox_id", it.id), zap.Error(err))
			}
			metrics.OutboxEventsPublishedTotal.Inc(it.eventType, "dead")
			metrics.OutboxDeadGauge.Inc()
			continue
		}

		backoff := computeBackoff(nextAttempt)
		nextRetry := time.Now().UTC().Add(backoff)
		if err := r.requeue(ctx, it.id, nextAttempt, nextRetry, pubErr.Error()); err != nil {
			r.logger.Error("failed requeueing outbox event", zap.String("outbox_id", it.id), zap.Error(err))
		}
		metrics.OutboxEventsPublishedTotal.Inc(it.eventType, "retry")
	}

	return nil
}

func (r *Relay) rowToEvent(it claimedOutboxRow) DomainEvent {
	payload := map[string]interface{}{}
	if len(it.payload) > 0 {
		_ = json.Unmarshal(it.payload, &payload)
	}
	meta := map[string]string{}
	if len(it.metadata) > 0 {
		_ = json.Unmarshal(it.metadata, &meta)
	}
	return DomainEvent{
		EventID:        it.eventID,
		EventVersion:   it.eventVersion,
		EventType:      it.eventType,
		AggregateType:  it.aggregateType,
		AggregateID:    it.aggregateID,
		CoachID:        it.coachID.String,
		AthleteID:      it.athleteID.String,
		OrganizationID: it.orgID.String,
		CorrelationID:  it.correlationID.String,
		CausationID:    it.causationID.String,
		OccurredAt:     it.occurredAt,
		Payload:        payload,
		Metadata:       meta,
	}
}

func (r *Relay) markPublished(ctx context.Context, id string, attempts int) error {
	return r.execWorkerTx(ctx, `
		UPDATE outbox
		SET status = 'published', published_at = NOW(), locked_by = NULL, locked_until = NULL, attempts = $1, last_error = NULL
		WHERE id = $2
	`, attempts, id)
}

func (r *Relay) requeue(ctx context.Context, id string, attempts int, nextRetry time.Time, errMsg string) error {
	return r.execWorkerTx(ctx, `
		UPDATE outbox
		SET status = 'pending', locked_by = NULL, locked_until = NULL, attempts = $1, next_retry_at = $2, last_error = $3
		WHERE id = $4
	`, attempts, nextRetry, errMsg, id)
}

func (r *Relay) markDead(ctx context.Context, it claimedOutboxRow, ev DomainEvent, attempts int, errMsg string) error {
	if err := r.execWorkerTx(ctx, `
		UPDATE outbox
		SET status = 'dead', published_at = COALESCE(published_at, NOW()), locked_by = NULL, locked_until = NULL, attempts = $1, last_error = $2
		WHERE id = $3
	`, attempts, errMsg, it.id); err != nil {
		return err
	}
	if r.dlq != nil {
		_ = r.dlq.SaveDeadLetter(ctx, DeadLetterRecord{
			StreamName:    "OUTBOX",
			Subject:       it.eventType,
			ConsumerName:  r.workerID,
			EventID:       ev.EventID,
			EventType:     it.eventType,
			CorrelationID: ev.CorrelationID,
			Payload:       it.payload,
			ErrorMessage:  errMsg,
			Attempts:      attempts,
		})
	}
	return nil
}

func (r *Relay) execWorkerTx(ctx context.Context, query string, args ...interface{}) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, "SELECT set_config('app.internal_execution_context', 'system_worker', true)"); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return err
	}
	return tx.Commit()
}

func computeBackoff(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 8 {
		attempt = 8
	}
	base := time.Duration(1<<uint(attempt)) * time.Second
	if base > 300*time.Second {
		base = 300 * time.Second
	}
	jitter := time.Duration(rand.Intn(1000)) * time.Millisecond
	return base + jitter
}
