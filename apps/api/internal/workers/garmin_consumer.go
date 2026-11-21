package workers

import (
	"context"
	"errors"
	"time"

	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

// GarminConsumer processes async Garmin activity sync requests queued by POST /webhooks/garmin.
type GarminConsumer struct {
	deps WorkerDeps
	log  *zap.Logger
}

// NewGarminConsumer builds a GarminConsumer.
func NewGarminConsumer(deps WorkerDeps, log *zap.Logger) *GarminConsumer {
	if log == nil {
		log = zap.NewNop()
	}
	return &GarminConsumer{deps: deps, log: log}
}

// Handle runs Garmin SyncFromProvider asynchronously with circuit-breaker/retry protection.
func (c *GarminConsumer) Handle(ctx context.Context, ev eventbus.DomainEvent) error {
	if c.deps.Garmin == nil {
		return nil
	}
	userID := strField(ev.Payload, "user_id", ev.AthleteID)
	if userID == "" {
		userID = ev.AggregateID
	}
	if userID == "" {
		return resilience.MarkNonRetryable(errors.New("wearable.garmin.sync_requested missing user_id"))
	}

	to := time.Now().UTC()
	from := to.AddDate(0, 0, -30)
	if rawTo := strField(ev.Payload, "to", ""); rawTo != "" {
		if parsed, err := time.Parse(time.RFC3339, rawTo); err == nil {
			to = parsed
		}
	}
	if rawFrom := strField(ev.Payload, "from", ""); rawFrom != "" {
		if parsed, err := time.Parse(time.RFC3339, rawFrom); err == nil {
			from = parsed
		}
	}

	synced, err := c.deps.Garmin.SyncFromProvider(ctx, "garmin", userID, from, to)
	if err != nil {
		return err
	}
	c.log.Info("garmin webhook sync completed", zap.String("user_id", userID), zap.Int("sessions_synced", synced))
	return nil
}
