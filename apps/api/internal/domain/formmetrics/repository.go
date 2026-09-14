package formmetrics

import "context"

// Repository defines the form metrics persistence interface.
type Repository interface {
	// InsertBatch inserts multiple form metrics in a single transaction.
	InsertBatch(ctx context.Context, metrics []*FormMetric) error

	// GetByAthlete returns all form metrics for an athlete, grouped by exercise.
	GetByAthlete(ctx context.Context, athleteID string) ([]*ExerciseFormStats, error)

	// GetByAthleteAndExercise returns form metrics for a specific athlete and exercise.
	GetByAthleteAndExercise(ctx context.Context, athleteID string, exerciseID string) ([]*FormMetric, error)
}
