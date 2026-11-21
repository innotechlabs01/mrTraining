package workers

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
)

// TrainingConsumer reacts to completed workouts by advancing gamification streaks and badges.
type TrainingConsumer struct {
	deps WorkerDeps
	log  *zap.Logger
}

// NewTrainingConsumer builds a TrainingConsumer.
func NewTrainingConsumer(deps WorkerDeps, log *zap.Logger) *TrainingConsumer {
	if log == nil {
		log = zap.NewNop()
	}
	return &TrainingConsumer{deps: deps, log: log}
}

// HandleWorkoutCompleted updates athlete streaks and checks unlocked badges.
func (c *TrainingConsumer) HandleWorkoutCompleted(ctx context.Context, ev eventbus.DomainEvent) error {
	if c.deps.Gamification == nil {
		return nil
	}
	athleteID := strField(ev.Payload, "athlete_id", ev.AthleteID)
	if athleteID == "" {
		return nil
	}
	workoutID := strField(ev.Payload, "workout_id", ev.AggregateID)
	dateStr := strField(ev.Payload, "workout_date", "")
	if dateStr == "" {
		if !ev.OccurredAt.IsZero() {
			dateStr = ev.OccurredAt.UTC().Format("2006-01-02")
		} else {
			dateStr = time.Now().UTC().Format("2006-01-02")
		}
	}

	var wIDPtr *string
	if workoutID != "" {
		wIDPtr = &workoutID
	}
	if _, err := c.deps.Gamification.LogWorkoutDay(ctx, athleteID, dateStr, wIDPtr); err != nil {
		return err
	}
	if _, err := c.deps.Gamification.CheckBadges(ctx, athleteID, 0, 0, 0); err != nil {
		return err
	}
	c.log.Info("training gamification updated", zap.String("athlete_id", athleteID), zap.String("workout_id", workoutID))
	return nil
}
