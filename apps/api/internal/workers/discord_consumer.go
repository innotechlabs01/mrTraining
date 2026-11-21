package workers

import (
	"context"
	"errors"
	"time"

	"go.uber.org/zap"

	errdomain "github.com/innotechlabs01/mr-training-api/internal/domain/error_tracking"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

// DiscordConsumer delivers platform error alerts to Discord out-of-band.
type DiscordConsumer struct {
	deps WorkerDeps
	log  *zap.Logger
}

// NewDiscordConsumer builds a DiscordConsumer.
func NewDiscordConsumer(deps WorkerDeps, log *zap.Logger) *DiscordConsumer {
	if log == nil {
		log = zap.NewNop()
	}
	return &DiscordConsumer{deps: deps, log: log}
}

// Handle posts error.reported events to Discord and backfills Discord IDs in DB.
func (c *DiscordConsumer) Handle(ctx context.Context, ev eventbus.DomainEvent) error {
	if c.deps.Discord == nil {
		return nil
	}

	errID := strField(ev.Payload, "id", ev.AggregateID)
	title := strField(ev.Payload, "title", "")
	if errID == "" || title == "" {
		return resilience.MarkNonRetryable(errors.New("error.reported missing id or title"))
	}

	createdAt := ev.OccurredAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}

	rec := &errdomain.Error{
		ID:          errID,
		Title:       title,
		Description: strField(ev.Payload, "description", ""),
		Source:      strField(ev.Payload, "source", "backend"),
		Severity:    strField(ev.Payload, "severity", errdomain.SeverityMedium),
		Status:      strField(ev.Payload, "status", errdomain.StatusOpen),
		CreatedAt:   createdAt,
	}

	msgID, chID, err := c.deps.Discord.Send(ctx, rec)
	if err != nil {
		return err
	}

	if msgID != "" && c.deps.DB != nil && c.deps.SuperAdminUserID != "" {
		tx, txErr := c.deps.DB.BeginTx(ctx, nil)
		if txErr == nil {
			defer tx.Rollback()
			if _, setErr := tx.ExecContext(ctx, `SELECT set_config('app.current_user_id', $1, true)`, c.deps.SuperAdminUserID); setErr == nil {
				_, _ = tx.ExecContext(ctx, `
					UPDATE platform_errors
					SET discord_message_id = $1, discord_channel_id = $2, updated_at = NOW()
					WHERE id = $3
				`, msgID, chID, errID)
				_ = tx.Commit()
			}
		}
	}

	c.log.Info("error notification sent to Discord", zap.String("error_id", errID), zap.String("discord_message_id", msgID))
	return nil
}
