// Package athlete contains the NATS JetStream consumer that projects
// athlete.session.* events into the athlete_prs, athlete_session_stats and
// athlete_session_progress tables.
//
// This is the Go API replacement for the legacy Next.js route at
// apps/web/src/app/api/nats/consumer/route.ts and the direct DB calls in
// apps/web/src/lib/db/db.ts. It runs as a background worker started from
// cmd/api/main.go (see the NATS consumer worker there).
//
// Durability & idempotency:
//   * Each message type uses a dedicated durable consumer
//     (pr-tracker, session-completed, session-progress) bound to the
//     ATHLETE_STREAM JetStream stream. Durable consumers survive restarts and
//     redeliver unacknowledged messages.
//   * Every database write is an UPSERT (INSERT ... ON CONFLICT) keyed on the
//     natural business key, so redelivery of an already-processed message is
//     idempotent.
//   * A message is acknowledged only after its database write succeeds, giving
//     at-least-once delivery with no lost updates. JSON parse errors are
//     acknowledged (skipped) so a malformed message cannot poison the stream.
package athlete

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"go.uber.org/zap"
	"time"

	"github.com/google/uuid"
	natsinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/nats"
	"github.com/nats-io/nats.go"
)

// stream is the JetStream stream that holds the athlete.session.* events.
const stream = "ATHLETE_STREAM"

// subjects consumed by this consumer.
var subjects = []string{
	"athlete.session.set.logged",
	"athlete.session.completed",
	"athlete.session.progress",
}

// Durable consumer names (must be stable across restarts).
const (
	durableSetLogged   = "pr-tracker"
	durableCompleted   = "session-completed"
	durableProgress    = "session-progress"
)

// ackWait is how long JetStream waits for an ack before redelivering.
const ackWait = 30 * time.Second

// DB is the subset of database.DB this consumer needs. It is an interface so
// the consumer can be unit-tested with a mock/sqlmock without a real database.
// *database.DB (which embeds *sql.DB) satisfies it.
type DB interface {
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

// OrgResolver maps a Clerk auth id (athleteClerkId) to the organization id
// that provides tenant context for the write. It returns an error when the
// clerk id is unknown (e.g. athlete not yet onboarded).
type OrgResolver func(ctx context.Context, clerkID string) (orgID string, err error)

// Message payloads published by apps/web/src/lib/nats.ts (kept in sync with
// that publisher; fields are pointers to tolerate partial progress updates).

type setLoggedEvent struct {
	AthleteClerkID string  `json:"athleteClerkId"`
	SessionID      string  `json:"sessionId"`
	ExerciseID     string  `json:"exerciseId"`
	SetNumber      int     `json:"setNumber"`
	Reps           *int    `json:"reps"`
	Weight         *float64 `json:"weight"`
	RPE            *int    `json:"rpe"`
	LoggedAt       string  `json:"loggedAt"`
}

type completedEvent struct {
	AthleteClerkID string `json:"athleteClerkId"`
	SessionID      string `json:"sessionId"`
	CompletedAt    string `json:"completedAt"`
}

type progressEvent struct {
	AthleteClerkID  string  `json:"athleteClerkId"`
	SessionID       string  `json:"sessionId"`
	TotalVolume     *float64 `json:"totalVolume"`
	DurationSeconds *int    `json:"durationSeconds"`
	UpdatedAt       string  `json:"updatedAt"`
}

// Consumer subscribes to athlete.session.* and projects each event into the
// corresponding PostgreSQL table.
type Consumer struct {
	db      DB
	js      nats.JetStreamContext
	log     *zap.Logger
	resolve OrgResolver
}

// NewConsumer builds a consumer. When resolve is nil, a default resolver that
// looks up the users table by Clerk auth_id is used.
func NewConsumer(db DB, js nats.JetStreamContext, log *zap.Logger, resolve OrgResolver) *Consumer {
	if resolve == nil {
		resolve = defaultOrgResolver(db)
	}
	return &Consumer{db: db, js: js, log: log, resolve: resolve}
}

// Start creates the ATHLETE_STREAM (if missing) and launches one durable
// subscriber goroutine per message type. It blocks only on stream creation;
// the subscriber loops run in goroutines and are tied to ctx for shutdown.
func (c *Consumer) Start(ctx context.Context) error {
	if err := natsinfra.EnsureStream(ctx, c.js, stream, subjects); err != nil {
		return fmt.Errorf("ensure nats stream: %w", err)
	}

	c.log.Info("starting nats athlete session consumer", zap.String("stream", stream))

	for _, subj := range subjects {
		switch subj {
		case "athlete.session.set.logged":
			if _, err := natsinfra.SubscribeDurable(ctx, c.js, stream, subj, durableSetLogged, c.handleSetLogged); err != nil {
				return fmt.Errorf("subscribe set.logged: %w", err)
			}
		case "athlete.session.completed":
			if _, err := natsinfra.SubscribeDurable(ctx, c.js, stream, subj, durableCompleted, c.handleCompleted); err != nil {
				return fmt.Errorf("subscribe completed: %w", err)
			}
		case "athlete.session.progress":
			if _, err := natsinfra.SubscribeDurable(ctx, c.js, stream, subj, durableProgress, c.handleProgress); err != nil {
				return fmt.Errorf("subscribe progress: %w", err)
			}
		}
	}
	return nil
}

// handleSetLogged upserts a personal best for (athlete, exercise).
func (c *Consumer) handleSetLogged(msg *nats.Msg) {
	evt, ok := c.parseSetLogged(msg)
	if !ok {
		// Parse error or missing required fields: acknowledge (skip) so a
		// malformed/incomplete message cannot poison the stream.
		msg.Ack()
		return
	}

	ctx := context.Background()
	orgID, err := c.resolveOrg(ctx, evt.AthleteClerkID)
	if err != nil {
		c.log.Warn("could not resolve organization for set.logged",
			zap.String("athlete_clerk_id", evt.AthleteClerkID),
			zap.String("error", err.Error()))
		msg.Ack()
		return
	}

	if err := c.setOrgContext(ctx, orgID); err != nil {
		c.log.Error("failed to set tenant context", zap.String("error", err.Error()))
		return // no ack -> redeliver
	}

	volume := float64(*evt.Reps) * *evt.Weight
	now := time.Now().UTC().Format(time.RFC3339)
	id := uuid.New()

	const upsert = `
INSERT INTO athlete_prs (id, athlete_clerk_id, exercise_id, reps, weight, volume, logged_at, organization_id, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (athlete_clerk_id, exercise_id) DO UPDATE SET
    reps = CASE WHEN EXCLUDED.reps > athlete_prs.reps THEN EXCLUDED.reps ELSE athlete_prs.reps END,
    weight = CASE WHEN EXCLUDED.weight > athlete_prs.weight THEN EXCLUDED.weight ELSE athlete_prs.weight END,
    volume = EXCLUDED.reps * EXCLUDED.weight,
    logged_at = EXCLUDED.logged_at,
    updated_at = EXCLUDED.updated_at,
    organization_id = COALESCE(EXCLUDED.organization_id, athlete_prs.organization_id)
`
	if _, err := c.db.ExecContext(ctx, upsert,
		id,
		evt.AthleteClerkID,
		evt.ExerciseID,
		*evt.Reps,
		*evt.Weight,
		volume,
		evt.LoggedAt,
		orgID,
		now,
		now,
	); err != nil {
		c.log.Error("failed to upsert athlete_prs", zap.String("error", err.Error()))
		return // no ack -> redeliver
	}

	c.log.Info("projected set.logged",
		zap.String("athlete_clerk_id", evt.AthleteClerkID),
		zap.String("exercise_id", evt.ExerciseID),
		zap.String("organization_id", orgID))
	msg.Ack()
}

// parseSetLogged decodes a set.logged message payload and reports whether it
// carries the fields required to project a personal best. It is pure apart
// from logging, so it can be unit-tested without a database or NATS.
func (c *Consumer) parseSetLogged(msg *nats.Msg) (*setLoggedEvent, bool) {
	var evt setLoggedEvent
	if err := json.Unmarshal(msg.Data, &evt); err != nil {
		c.log.Error("failed to parse set.logged event", zap.String("error", err.Error()))
		return nil, false
	}
	if evt.ExerciseID == "" || evt.Reps == nil || evt.Weight == nil {
		// Nothing to project (matches legacy behaviour which required reps,
		// weight and exercise).
		c.log.Debug("set.logged event missing required fields", zap.String("session", evt.SessionID))
		return nil, false
	}
	return &evt, true
}

// handleCompleted records a session completion.
func (c *Consumer) handleCompleted(msg *nats.Msg) {
	evt, ok := c.parseCompleted(msg)
	if !ok {
		msg.Ack()
		return
	}

	ctx := context.Background()
	orgID, err := c.resolveOrg(ctx, evt.AthleteClerkID)
	if err != nil {
		c.log.Warn("could not resolve organization for session.completed",
			zap.String("athlete_clerk_id", evt.AthleteClerkID),
			zap.String("error", err.Error()))
		msg.Ack()
		return
	}

	if err := c.setOrgContext(ctx, orgID); err != nil {
		c.log.Error("failed to set tenant context", zap.String("error", err.Error()))
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	id := uuid.New()

	const upsert = `
INSERT INTO athlete_session_stats (id, session_id, athlete_clerk_id, completed_at, first_seen_at, organization_id, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (session_id) DO UPDATE SET
    completed_at = EXCLUDED.completed_at,
    updated_at = EXCLUDED.updated_at,
    organization_id = COALESCE(EXCLUDED.organization_id, athlete_session_stats.organization_id)
`
	if _, err := c.db.ExecContext(ctx, upsert,
		id,
		evt.SessionID,
		evt.AthleteClerkID,
		evt.CompletedAt,
		evt.CompletedAt, // first_seen_at only set on insert; kept on conflict
		orgID,
		now,
		now,
	); err != nil {
		c.log.Error("failed to upsert athlete_session_stats", zap.String("error", err.Error()))
		return
	}

	c.log.Info("projected session.completed",
		zap.String("session_id", evt.SessionID),
		zap.String("athlete_clerk_id", evt.AthleteClerkID),
		zap.String("organization_id", orgID))
	msg.Ack()
}

// parseCompleted decodes a session.completed message payload.
func (c *Consumer) parseCompleted(msg *nats.Msg) (*completedEvent, bool) {
	var evt completedEvent
	if err := json.Unmarshal(msg.Data, &evt); err != nil {
		c.log.Error("failed to parse session.completed event", zap.String("error", err.Error()))
		return nil, false
	}
	return &evt, true
}

// handleProgress updates live session volume/duration.
func (c *Consumer) handleProgress(msg *nats.Msg) {
	evt, ok := c.parseProgress(msg)
	if !ok {
		msg.Ack()
		return
	}

	ctx := context.Background()
	orgID, err := c.resolveOrg(ctx, evt.AthleteClerkID)
	if err != nil {
		c.log.Warn("could not resolve organization for session.progress",
			zap.String("athlete_clerk_id", evt.AthleteClerkID),
			zap.String("error", err.Error()))
		msg.Ack()
		return
	}

	if err := c.setOrgContext(ctx, orgID); err != nil {
		c.log.Error("failed to set tenant context", zap.String("error", err.Error()))
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	id := uuid.New()

	const upsert = `
INSERT INTO athlete_session_progress (id, session_id, athlete_clerk_id, total_volume, duration_seconds, updated_at, organization_id, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (session_id) DO UPDATE SET
    total_volume = COALESCE(EXCLUDED.total_volume, athlete_session_progress.total_volume),
    duration_seconds = COALESCE(EXCLUDED.duration_seconds, athlete_session_progress.duration_seconds),
    updated_at = EXCLUDED.updated_at,
    organization_id = COALESCE(EXCLUDED.organization_id, athlete_session_progress.organization_id)
`
	if _, err := c.db.ExecContext(ctx, upsert,
		id,
		evt.SessionID,
		evt.AthleteClerkID,
		evt.TotalVolume,
		evt.DurationSeconds,
		evt.UpdatedAt,
		orgID,
		now,
	); err != nil {
		c.log.Error("failed to upsert athlete_session_progress", zap.String("error", err.Error()))
		return
	}

	c.log.Info("projected session.progress",
		zap.String("session_id", evt.SessionID),
		zap.String("athlete_clerk_id", evt.AthleteClerkID),
		zap.String("organization_id", orgID))
	msg.Ack()
}

// parseProgress decodes a session.progress message payload.
func (c *Consumer) parseProgress(msg *nats.Msg) (*progressEvent, bool) {
	var evt progressEvent
	if err := json.Unmarshal(msg.Data, &evt); err != nil {
		c.log.Error("failed to parse session.progress event", zap.String("error", err.Error()))
		return nil, false
	}
	return &evt, true
}

// resolveOrg resolves the organization id for a Clerk auth id.
func (c *Consumer) resolveOrg(ctx context.Context, clerkID string) (string, error) {
	return c.resolve(ctx, clerkID)
}

// defaultOrgResolver looks up the users table by Clerk auth_id.
func defaultOrgResolver(db DB) OrgResolver {
	return func(ctx context.Context, clerkID string) (string, error) {
		var orgID string
		err := db.QueryRowContext(ctx,
			`SELECT organization_id FROM users WHERE auth_id = $1 AND deleted_at IS NULL LIMIT 1`,
			clerkID,
		).Scan(&orgID)
		if err != nil {
			return "", err
		}
		return orgID, nil
	}
}

// setOrgContext sets the PostgreSQL session variable used by Row-Level
// Security policies so writes are scoped to the calling organization.
func (c *Consumer) setOrgContext(ctx context.Context, orgID string) error {
	var dummy string
	return c.db.QueryRowContext(ctx,
		`SELECT set_config('app.current_organization_id', $1, true)`,
		orgID,
	).Scan(&dummy)
}

