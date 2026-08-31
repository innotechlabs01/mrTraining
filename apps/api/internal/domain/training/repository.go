package training

import "context"

// ExerciseRepository defines the data access interface for exercises.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type ExerciseRepository interface {
	// List retrieves exercises with optional filters and pagination.
	// Returns an empty slice (not nil) if no exercises match.
	List(ctx context.Context, filter ExerciseFilter, offset, limit int) ([]*ExerciseEntry, int, error)

	// GetByID retrieves an exercise entry by its unique identifier.
	// Returns ErrNotFound if no exercise exists with the given ID.
	GetByID(ctx context.Context, id string) (*ExerciseEntry, error)

	// Create inserts a new custom exercise entry for a coach.
	// Returns an error if the slug is already taken or on database failure.
	Create(ctx context.Context, exercise *ExerciseEntry) error
}

// WorkoutRepository defines the data access interface for workouts.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type WorkoutRepository interface {
	// ListTemplates retrieves all workout templates for a specific coach.
	// Returns an empty slice (not nil) if no templates exist.
	ListTemplates(ctx context.Context, coachID string) ([]*WorkoutTemplate, error)

	// GetTemplate retrieves a workout template by its unique identifier,
	// including all associated exercises.
	// Returns ErrNotFound if no template exists with the given ID.
	GetTemplate(ctx context.Context, id string) (*WorkoutTemplate, error)

	// CreateTemplate inserts a new workout template with its exercises.
	CreateTemplate(ctx context.Context, template *WorkoutTemplate) error

	// UpdateTemplate updates an existing workout template and its exercises.
	UpdateTemplate(ctx context.Context, template *WorkoutTemplate) error

	// AssignWorkout assigns a workout template to an athlete.
	// Creates the assigned_workout record and copies exercises from the template.
	AssignWorkout(ctx context.Context, assigned *AssignedWorkout) error

	// ListAssignedWorkouts retrieves all assigned workouts for an athlete.
	// Returns an empty slice (not nil) if no assignments exist.
	ListAssignedWorkouts(ctx context.Context, athleteID string) ([]*AssignedWorkout, error)

	// GetAssignedWorkout retrieves a single assigned workout by ID.
	// Returns ErrNotFound if no assignment exists with the given ID.
	GetAssignedWorkout(ctx context.Context, id string) (*AssignedWorkout, error)

	// LogWorkoutSet records a completed set within a workout session.
	// Creates the session if one doesn't exist for the workout/athlete pair.
	LogWorkoutSet(ctx context.Context, set *WorkoutSet, workoutID, athleteID string) (*WorkoutSet, error)

	// GetAssignedWorkoutDetail retrieves a full assigned workout with its exercises.
	GetAssignedWorkoutDetail(ctx context.Context, id string) (*WorkoutDetail, error)

	// GetWorkoutSession retrieves a workout session by ID.
	GetWorkoutSession(ctx context.Context, sessionID string) (*WorkoutSession, error)

	// CreateWorkoutSession creates a new workout session for an athlete.
	CreateWorkoutSession(ctx context.Context, workoutID, athleteID string) (*WorkoutSession, error)

	// CompleteSession marks a session as completed with the given duration.
	CompleteSession(ctx context.Context, sessionID string, durationSeconds int) error

	// GetPrescription retrieves the exercise prescription for an assigned workout.
	GetPrescription(ctx context.Context, workoutID string) ([]WorkoutExercise, error)

	// ListAssignedWorkoutsByCoach retrieves all assigned workouts created by a coach.
	ListAssignedWorkoutsByCoach(ctx context.Context, coachID string) ([]*AssignedWorkout, error)

	// UpdateAssignedWorkout updates an assigned workout's fields.
	UpdateAssignedWorkout(ctx context.Context, id string, aw *AssignedWorkout) error

	// DeleteAssignedWorkout deletes an assigned workout and its exercises.
	DeleteAssignedWorkout(ctx context.Context, id string) error

	// DeleteTemplate deletes a workout template and its exercises.
	DeleteTemplate(ctx context.Context, id string) error
}

// ProgressRepository defines the data access interface for progress tracking.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type ProgressRepository interface {
	// GetProgress retrieves progress entries for an athlete within a date range.
	// Returns an empty slice (not nil) if no progress data exists.
	GetProgress(ctx context.Context, athleteID string, dateRange ProgressDateRange) ([]*ProgressEntry, error)
}

// TrainingSessionRepository defines the data access interface for training sessions.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type TrainingSessionRepository interface {
	// Create persists a new training session.
	Create(ctx context.Context, session *TrainingSession) error
	// List retrieves training sessions for a coach or athlete with optional filters.
	// Returns an empty slice (not nil) if no sessions match.
	List(ctx context.Context, coachID, athleteID string) ([]*TrainingSession, error)
}
