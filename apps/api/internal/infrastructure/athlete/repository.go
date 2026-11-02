// Package athlete provides the PostgreSQL repository implementation for the
// Athlete aggregate. It acts as a thin facade over the existing training
// (workouts) and message sub-domain repositories, delegating reads without
// duplicating business logic.
package athlete

import (
	"context"
	"database/sql"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/domain/message"
	trainingdomain "github.com/innotechlabs01/mr-training-api/internal/domain/training"
	messageinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/message"
	traininginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/training"
)

// repository implements domain.Repository by composing existing sub-domain
// repositories. It owns no tables of its own; it aggregates reads.
type repository struct {
	db          *sql.DB
	workoutRepo trainingdomain.WorkoutRepository
	messageRepo message.Repository
}

// NewRepository creates a new athlete repository facade over the given
// database connection. It constructs the underlying sub-domain repositories.
func NewRepository(db *sql.DB) domain.Repository {
	return &repository{
		db:          db,
		workoutRepo: traininginfra.NewWorkoutRepository(db),
		messageRepo: messageinfra.NewRepository(db),
	}
}

func (r *repository) GetByID(ctx context.Context, id string) (*domain.Athlete, error) {
	return nil, fmt.Errorf("GetByID not supported by athlete facade: %w", ErrNotImplemented)
}

func (r *repository) GetWorkouts(ctx context.Context, athleteID string) ([]*domain.WorkoutSummary, error) {
	assigned, err := r.workoutRepo.ListAssignedWorkouts(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("list assigned workouts: %w", err)
	}
	summaries := make([]*domain.WorkoutSummary, len(assigned))
	for i, w := range assigned {
		summaries[i] = &domain.WorkoutSummary{
			ID:            w.ID,
			Name:          w.ContentName,
			SportType:     "", // not tracked on assigned_workouts
			ScheduledDate: w.StartDate,
			Status:        w.Status,
		}
	}
	if summaries == nil {
		summaries = []*domain.WorkoutSummary{}
	}
	return summaries, nil
}

func (r *repository) GetMetrics(ctx context.Context, athleteID string) ([]*domain.MetricPoint, error) {
	// No athlete time-series metrics table exists yet; return empty list
	// rather than erroring, per the graceful-missing-tables rule.
	return []*domain.MetricPoint{}, nil
}

func (r *repository) GetMessages(ctx context.Context, athleteID string) ([]*domain.MessageThread, error) {
	threads, err := r.messageRepo.GetThreads(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("list message threads: %w", err)
	}
	result := make([]*domain.MessageThread, len(threads))
	for i, t := range threads {
		result[i] = &domain.MessageThread{
			ID:          t.ID,
			CoachID:     t.CoachID,
			CoachName:   t.AthleteName,
			Subject:     t.Subject,
			LastMessage: t.LastMessage,
			LastSentAt:  t.LastSentAt,
			UnreadCount: t.UnreadCount,
			CreatedAt:   t.CreatedAt,
		}
	}
	if result == nil {
		result = []*domain.MessageThread{}
	}
	return result, nil
}

// ErrNotImplemented is returned for operations the facade does not support.
var ErrNotImplemented = fmt.Errorf("not implemented")
