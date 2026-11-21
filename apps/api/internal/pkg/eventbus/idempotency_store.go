package eventbus

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// SQLProcessedEventStore persists consumer idempotency records in PostgreSQL.
type SQLProcessedEventStore struct {
	db *sql.DB
}

// NewSQLProcessedEventStore creates a PostgreSQL-backed ProcessedEventStore.
func NewSQLProcessedEventStore(db *sql.DB) *SQLProcessedEventStore {
	return &SQLProcessedEventStore{db: db}
}

// IsProcessed reports whether eventID has already been processed by consumerName.
func (s *SQLProcessedEventStore) IsProcessed(ctx context.Context, consumerName, eventID string) (bool, error) {
	if s == nil || s.db == nil || eventID == "" {
		return false, nil
	}
	opCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := s.db.BeginTx(opCtx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(opCtx, "SELECT set_config('app.internal_execution_context', 'system_worker', true)"); err != nil {
		return false, err
	}

	var exists bool
	if err := tx.QueryRowContext(opCtx,
		`SELECT EXISTS(SELECT 1 FROM processed_events WHERE consumer_name = $1 AND event_id = $2)`,
		consumerName, eventID,
	).Scan(&exists); err != nil {
		return false, err
	}
	_ = tx.Commit()
	return exists, nil
}

// MarkProcessed records eventID as handled by consumerName idempotently.
func (s *SQLProcessedEventStore) MarkProcessed(ctx context.Context, consumerName, eventID, subject string) error {
	if s == nil || s.db == nil || eventID == "" {
		return nil
	}
	opCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := s.db.BeginTx(opCtx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(opCtx, "SELECT set_config('app.internal_execution_context', 'system_worker', true)"); err != nil {
		return err
	}

	if _, err := tx.ExecContext(opCtx,
		`INSERT INTO processed_events (consumer_name, event_id, subject, processed_at)
		 VALUES ($1, $2, $3, NOW())
		 ON CONFLICT (consumer_name, event_id) DO NOTHING`,
		consumerName, eventID, subject,
	); err != nil {
		return fmt.Errorf("mark processed event: %w", err)
	}
	return tx.Commit()
}

// SQLDeadLetterStore persists dead-lettered events in PostgreSQL for operator visibility.
type SQLDeadLetterStore struct {
	db *sql.DB
}

// NewSQLDeadLetterStore creates a PostgreSQL-backed DeadLetterStore.
func NewSQLDeadLetterStore(db *sql.DB) *SQLDeadLetterStore {
	return &SQLDeadLetterStore{db: db}
}

// SaveDeadLetter inserts a dead-letter record inside a system_worker transaction.
func (s *SQLDeadLetterStore) SaveDeadLetter(ctx context.Context, rec DeadLetterRecord) error {
	if s == nil || s.db == nil {
		return nil
	}
	opCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := s.db.BeginTx(opCtx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(opCtx, "SELECT set_config('app.internal_execution_context', 'system_worker', true)"); err != nil {
		return err
	}

	payloadStr := "{}"
	if len(rec.Payload) > 0 {
		payloadStr = string(rec.Payload)
	}
	attempts := rec.Attempts
	if attempts <= 0 {
		attempts = 1
	}

	if _, err := tx.ExecContext(opCtx, `
		INSERT INTO dead_letter_events (
			stream_name, subject, consumer_name, event_id, event_type,
			correlation_id, payload, error_message, attempts
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
	`,
		rec.StreamName,
		rec.Subject,
		rec.ConsumerName,
		nullStr(rec.EventID),
		rec.EventType,
		nullStr(rec.CorrelationID),
		payloadStr,
		rec.ErrorMessage,
		attempts,
	); err != nil {
		return fmt.Errorf("insert dead letter event: %w", err)
	}
	return tx.Commit()
}
