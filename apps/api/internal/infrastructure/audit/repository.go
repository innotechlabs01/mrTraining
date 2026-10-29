// Package audit provides the persistence layer for the append-only financial
// audit trail.
package audit

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"

	auditdomain "github.com/innotechlabs01/mr-training-api/internal/domain/audit"
)

// Repository reads audit events. Writes go through InsertTx so they always share
// the transaction of the mutation they describe.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new audit repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// InsertTx appends an audit event using the caller's transaction. Because it uses
// the same *sql.Tx as the mutation, the event and the mutation commit or roll
// back together: if the audit insert fails the whole operation is undone (H-05).
func InsertTx(ctx context.Context, tx *sql.Tx, e auditdomain.Event) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.ActorType == "" {
		e.ActorType = "user"
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO financial_audit_events (id, entity, entity_id, action, actor_id, actor_type, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`, e.ID, e.Entity, e.EntityID, e.Action, nullable(e.ActorID), e.ActorType, nullable(e.Payload))
	if err != nil {
		return fmt.Errorf("failed to write audit event: %w", err)
	}
	return nil
}

// ListRecent returns the most recent audit events, newest first.
func (r *Repository) ListRecent(ctx context.Context, limit int) ([]*auditdomain.Event, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, entity, entity_id, action, COALESCE(actor_id, ''), actor_type, COALESCE(payload, ''), created_at
		FROM financial_audit_events
		ORDER BY created_at DESC, id DESC
		LIMIT $8
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list audit events: %w", err)
	}
	defer rows.Close()

	var events []*auditdomain.Event
	for rows.Next() {
		var e auditdomain.Event
		if err := rows.Scan(&e.ID, &e.Entity, &e.EntityID, &e.Action, &e.ActorID, &e.ActorType, &e.Payload, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan audit event: %w", err)
		}
		events = append(events, &e)
	}
	return events, rows.Err()
}

// nullable converts an empty string to a SQL NULL.
func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
