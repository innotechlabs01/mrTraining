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

	// GetByCoach returns aggregated form metrics for all athletes of a coach,
	// grouped by athlete+exercise.
	GetByCoach(ctx context.Context, coachID string) ([]*CoachAthleteFormStats, error)

	// GetConsent retrieves the athlete's persisted AI form-recording consent ("pending" | "accepted" | "denied").
	GetConsent(ctx context.Context, athleteID string) (string, error)

	// SetConsent upserts the athlete's AI form-recording consent ("accepted" | "denied" | "pending").
	SetConsent(ctx context.Context, athleteID, consent string) error
}
