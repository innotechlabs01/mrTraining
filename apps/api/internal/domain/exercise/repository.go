package exercise

import "context"

// Repository defines the data access interface for the exercise domain.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type Repository interface {
	// GetByID retrieves an exercise entry by its unique identifier.
	// Returns ErrNotFound if no exercise exists with the given ID.
	GetByID(ctx context.Context, id string) (*ExerciseEntry, error)

	// GetBySlug retrieves an exercise entry by its URL-friendly slug.
	// Returns ErrNotFound if no exercise exists with the given slug.
	GetBySlug(ctx context.Context, slug string) (*ExerciseEntry, error)

	// ListGlobal retrieves all global (non-custom) exercises visible to every coach.
	// Returns an empty slice (not nil) if no global exercises exist.
	ListGlobal(ctx context.Context) ([]*ExerciseEntry, error)

	// ListByCoach retrieves global exercises plus custom exercises for a specific coach.
	// Returns an empty slice (not nil) if no exercises exist.
	ListByCoach(ctx context.Context, coachID string) ([]*ExerciseEntry, error)

	// Create inserts a new custom exercise entry for a coach.
	// Returns an error if the slug is already taken or on database failure.
	Create(ctx context.Context, exercise *ExerciseEntry) error

	// Update modifies an existing exercise entry.
	// Returns an error if the exercise does not exist or on database failure.
	Update(ctx context.Context, exercise *ExerciseEntry) error

	// Delete removes an exercise entry.
	// Returns an error if the exercise does not exist or on database failure.
	Delete(ctx context.Context, id string) error
}
