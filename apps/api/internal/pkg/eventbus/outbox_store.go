package eventbus

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// SQLOutboxStore persists DomainEvents into public.outbox inside either a caller's
// transaction executor or a standalone system_worker transaction.
type SQLOutboxStore struct {
	db *sql.DB
}

// NewSQLOutboxStore creates an OutboxWriter backed by db.
func NewSQLOutboxStore(db *sql.DB) *SQLOutboxStore {
	return &SQLOutboxStore{db: db}
}

// Insert writes event into public.outbox. When exec is nil and s.db is set, it
// opens a short transaction with system_worker RLS context.
func (s *SQLOutboxStore) Insert(ctx context.Context, exec database.Executor, event DomainEvent) error {
	if event.EventID == "" {
		event.EventID = uuid.New().String()
	}
	if event.EventVersion <= 0 {
		event.EventVersion = 1
	}
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now().UTC()
	}

	payloadJSON, err := json.Marshal(event.Payload)
	if err != nil {
		return fmt.Errorf("marshal outbox payload: %w", err)
	}
	if len(payloadJSON) == 0 || string(payloadJSON) == "null" {
		payloadJSON = []byte(`{}`)
	}

	metaJSON := []byte(`{}`)
	if len(event.Metadata) > 0 {
		if b, merr := json.Marshal(event.Metadata); merr == nil {
			metaJSON = b
		}
	}

	const query = `
INSERT INTO outbox (
	id, event_id, event_type, aggregate_type, aggregate_id,
	coach_id, athlete_id, payload, occurred_at, next_retry_at, status,
	event_version, correlation_id, causation_id, organization_id, metadata
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'pending', $10, $11, $12, $13, $14)
`
	rowID := uuid.New().String()
	args := []interface{}{
		rowID,
		event.EventID,
		event.EventType,
		event.AggregateType,
		event.AggregateID,
		nullStr(event.CoachID),
		nullStr(event.AthleteID),
		string(payloadJSON),
		event.OccurredAt.UTC(),
		event.EventVersion,
		nullStr(event.CorrelationID),
		nullStr(event.CausationID),
		nullStr(event.OrganizationID),
		string(metaJSON),
	}

	if exec != nil {
		if _, err := exec.ExecContext(ctx, query, args...); err != nil {
			return fmt.Errorf("insert outbox: %w", err)
		}
		return nil
	}

	if s == nil || s.db == nil {
		return fmt.Errorf("insert outbox: neither executor nor db configured")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin outbox tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, "SELECT set_config('app.internal_execution_context', 'system_worker', true)"); err != nil {
		return fmt.Errorf("set outbox execution context: %w", err)
	}
	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("insert outbox: %w", err)
	}
	return tx.Commit()
}

func nullStr(v string) interface{} {
	if v == "" {
		return nil
	}
	return v
}
