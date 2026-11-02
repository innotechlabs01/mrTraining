package workout

import "context"

// Repository defines the data access interface for the workout domain.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type Repository interface {
	// GetByID retrieves a workout template by its unique identifier,
	// including all associated exercises.
	// Returns ErrNotFound if no template exists with the given ID.
	GetByID(ctx context.Context, id string) (*WorkoutTemplate, error)

	// ListByCoach retrieves all workout templates for a specific coach.
	// Returns an empty slice (not nil) if no templates exist.
	ListByCoach(ctx context.Context, coachID string) ([]*WorkoutTemplate, error)

	// Create inserts a new workout template with its exercises.
	// The template's Exercises slice is populated after insertion.
	Create(ctx context.Context, template *WorkoutTemplate) error

	// Update modifies an existing workout template and replaces its exercises.
	// Returns an error if the template does not exist or on database failure.
	Update(ctx context.Context, template *WorkoutTemplate) error

	// Delete removes a workout template and all associated exercises.
	// Returns an error if the template does not exist or on database failure.
	Delete(ctx context.Context, id string) error
}
