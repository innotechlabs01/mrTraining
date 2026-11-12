package outbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"math/rand"
	"time"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	"go.uber.org/zap"
)

type Worker struct {
	db     *sql.DB
	logger *zap.Logger
	period time.Duration
	batch  int
}

func NewWorker(db *sql.DB, logger *zap.Logger) *Worker {
	if logger == nil {
		logger = zap.NewNop()
	}
	return &Worker{
		db:     db,
		logger: logger,
		period: 500 * time.Millisecond,
		batch:  50,
	}
}

func (w *Worker) Start(ctx context.Context) error {
	ticker := time.NewTicker(w.period)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := w.recoverExpired(ctx); err != nil {
				w.logger.Error("outbox recover failed", zap.Error(err))
			}
			if err := w.processBatch(ctx); err != nil {
				w.logger.Error("outbox batch failed", zap.Error(err))
			}
		}
	}
}

func (w *Worker) recoverExpired(ctx context.Context) error {
	tx, err := w.db.BeginTx(ctx, nil)
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

func (w *Worker) recoverExpiredLegacy(ctx context.Context) error {
	_, err := w.db.ExecContext(ctx, `
		UPDATE outbox
		SET status = 'pending', locked_by = NULL, locked_until = NULL
		WHERE status = 'processing'
		  AND locked_until IS NOT NULL
		  AND locked_until < NOW()
	`)
	return err
}

type outboxRow struct {
	ID          string
	EventID     sql.NullString
	EventType   string
	AggregateID string
	CoachID     sql.NullString
	AthleteID   sql.NullString
	Payload     []byte
	Attempts    int
}

func (w *Worker) processBatch(ctx context.Context) error {
	tx, err := w.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, "SELECT set_config('app.internal_execution_context', 'system_worker', true)"); err != nil {
		return err
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT id, COALESCE(event_id::text, id::text), event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, attempts
		FROM outbox
		WHERE status IN ('pending')
		  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		  AND (locked_until IS NULL OR locked_until < NOW())
		ORDER BY occurred_at ASC
		FOR UPDATE SKIP LOCKED
		LIMIT $1
	`, w.batch)
	if err != nil {
		return err
	}
	defer rows.Close()

	var items []outboxRow
	for rows.Next() {
		var r outboxRow
		var aggType string
		if err := rows.Scan(&r.ID, &r.EventID, &r.EventType, &aggType, &r.AggregateID, &r.CoachID, &r.AthleteID, &r.Payload, &r.Attempts); err != nil {
			return err
		}
		items = append(items, r)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(items) == 0 {
		return tx.Commit()
	}

	workerID := "outbox-worker"
	for _, it := range items {
		leaseUntil := time.Now().Add(30 * time.Second)
		if _, err := tx.ExecContext(ctx, `
			UPDATE outbox SET status = 'processing', locked_by = $1, locked_until = $2
			WHERE id = $3 AND status IN ('pending')
		`, workerID, leaseUntil, it.ID); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	maxAttempts := 5
	for _, it := range items {
		var payload map[string]interface{}
		if len(it.Payload) > 0 {
			_ = json.Unmarshal(it.Payload, &payload)
		}
		if payload == nil {
			payload = map[string]interface{}{}
		}

		ev := runningapp.Event{
			Type:      it.EventType,
			Payload:   payload,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}

		// Determine routing key
		if it.EventType == "workout.progress" || it.EventType == "workout.connected" {
			ev.WorkoutID = it.AggregateID
			runningapp.DefaultHub.Publish(ev)
		} else if it.EventType == "workout.started" || it.EventType == "workout.completed" {
			// Publish to coach if known, also could publish to athlete; try coach first
			if it.CoachID.Valid && it.CoachID.String != "" {
				ev.WorkoutID = it.CoachID.String
				runningapp.DefaultHub.Publish(ev)
			}
			if it.AthleteID.Valid && it.AthleteID.String != "" {
				ev2 := ev
				ev2.WorkoutID = it.AthleteID.String
				runningapp.DefaultHub.Publish(ev2)
			}
			if it.CoachID.Valid && it.CoachID.String == "" && it.AthleteID.Valid && it.AthleteID.String != "" {
				ev.WorkoutID = it.AthleteID.String
				runningapp.DefaultHub.Publish(ev)
			}
		} else if it.EventType == "template.created" || it.EventType == "template.updated" {
			if it.CoachID.Valid && it.CoachID.String != "" {
				ev.WorkoutID = it.CoachID.String
				runningapp.DefaultHub.Publish(ev)
			}
		} else if it.EventType == "assignment.created" {
			if it.AthleteID.Valid && it.AthleteID.String != "" {
				ev.WorkoutID = it.AthleteID.String
				runningapp.DefaultHub.Publish(ev)
			}
			if it.CoachID.Valid && it.CoachID.String != "" {
				ev2 := ev
				ev2.WorkoutID = it.CoachID.String
				runningapp.DefaultHub.Publish(ev2)
			}
		} else {
			if it.CoachID.Valid && it.CoachID.String != "" {
				ev.WorkoutID = it.CoachID.String
				runningapp.DefaultHub.Publish(ev)
			} else if it.AthleteID.Valid && it.AthleteID.String != "" {
				ev.WorkoutID = it.AthleteID.String
				runningapp.DefaultHub.Publish(ev)
			} else {
				ev.WorkoutID = it.AggregateID
				runningapp.DefaultHub.Publish(ev)
			}
		}

		newAttempts := it.Attempts + 1
		if newAttempts >= maxAttempts {
			_, err = w.db.ExecContext(ctx, `
				UPDATE outbox SET status = 'dead', published_at = COALESCE(published_at, NOW()), locked_by = NULL, locked_until = NULL, attempts = $1, last_error = $2
				WHERE id = $3
			`, newAttempts, "max attempts reached", it.ID)
			if err != nil {
				w.logger.Error("failed to mark dead", zap.Error(err), zap.String("id", it.ID))
			}
			continue
		}

		_, err = w.db.ExecContext(ctx, `
			UPDATE outbox SET status = 'published', published_at = NOW(), locked_by = NULL, locked_until = NULL, attempts = $1
			WHERE id = $2
		`, newAttempts, it.ID)
		if err != nil {
			w.logger.Error("failed to mark published", zap.Error(err), zap.String("id", it.ID))
			// try to requeue
			backoff := time.Duration(1<<uint(newAttempts)) * time.Second
			if backoff > 300*time.Second {
				backoff = 300 * time.Second
			}
			jitter := time.Duration(rand.Intn(1000)) * time.Millisecond
			_, _ = w.db.ExecContext(ctx, `
				UPDATE outbox SET status = 'pending', locked_by = NULL, locked_until = NULL, attempts = $1, next_retry_at = NOW() + $2 + $3, last_error = $4
				WHERE id = $5
			`, newAttempts, backoff, jitter, err.Error(), it.ID)
		}
	}

	return nil
}
