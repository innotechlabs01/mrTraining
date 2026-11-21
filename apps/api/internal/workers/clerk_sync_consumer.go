package workers

import (
	"context"
	"errors"
	"fmt"

	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

// ClerkSyncConsumer synchronizes subscription/role metadata back to Clerk API
// out of band and invalidates local+Redis role caches.
type ClerkSyncConsumer struct {
	deps WorkerDeps
	log  *zap.Logger
}

// NewClerkSyncConsumer builds a ClerkSyncConsumer.
func NewClerkSyncConsumer(deps WorkerDeps, log *zap.Logger) *ClerkSyncConsumer {
	if log == nil {
		log = zap.NewNop()
	}
	return &ClerkSyncConsumer{deps: deps, log: log}
}

// Handle updates Clerk public metadata and clears the cached role entry.
func (c *ClerkSyncConsumer) Handle(ctx context.Context, ev eventbus.DomainEvent) error {
	if c.deps.Metadata == nil {
		return nil
	}
	userID := strField(ev.Payload, "user_id", ev.AthleteID)
	if userID == "" {
		userID = ev.AggregateID
	}
	patch, _ := ev.Payload["patch"].(map[string]interface{})
	if len(patch) == 0 {
		patch = map[string]interface{}{}
		for _, k := range []string{"plan", "planName", "planStatus", "role", "coachCode"} {
			if v, exists := ev.Payload[k]; exists && v != nil && v != "" {
				patch[k] = v
			}
		}
	}
	if userID == "" || len(patch) == 0 {
		return resilience.MarkNonRetryable(errors.New("clerk.metadata.sync_requested missing user_id or metadata patch"))
	}

	if err := c.deps.Metadata.MergePublicMetadata(ctx, userID, patch); err != nil {
		return fmt.Errorf("sync clerk public metadata for %s: %w", userID, err)
	}
	if c.deps.InvalidateRole != nil {
		c.deps.InvalidateRole(userID)
	}
	c.log.Info("clerk public metadata synchronized", zap.String("user_id", userID))
	return nil
}
