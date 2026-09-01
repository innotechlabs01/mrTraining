package user

import "context"

// Repository defines the data access interface for the user domain.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type Repository interface {
	// GetByID retrieves a user by their unique identifier.
	// Returns ErrNotFound if no user exists with the given ID.
	GetByID(ctx context.Context, id string) (*User, error)

	// GetByEmail retrieves a user by their email address.
	// Returns ErrNotFound if no user exists with the given email.
	GetByEmail(ctx context.Context, email string) (*User, error)

	// Create inserts a new user record.
	// Returns an error if the user already exists or on database failure.
	Create(ctx context.Context, user *User) error

	// Update modifies an existing user record.
	// Returns an error if the user does not exist or on database failure.
	Update(ctx context.Context, user *User) error

	// GetCoach retrieves the coach profile for a user.
	// Returns ErrNotFound if the user does not have a coach profile.
	GetCoach(ctx context.Context, userID string) (*Coach, error)

	// GetAthleteProfile retrieves the athlete profile for a user.
	// Returns ErrNotFound if the user does not have an athlete profile.
	GetAthleteProfile(ctx context.Context, userID string) (*AthleteProfile, error)

	// ListCoaches retrieves all active coaches.
	// Returns an empty slice (not nil) if no coaches exist.
	ListCoaches(ctx context.Context) ([]*Coach, error)

	// ListAthletesByCoach retrieves all athletes linked to a specific coach.
	// Returns an empty slice (not nil) if no athletes are linked.
	ListAthletesByCoach(ctx context.Context, coachID string) ([]*AthleteProfile, error)

	// UpdateAthleteProfile updates the athlete's extended profile fields.
	// Returns ErrNotFound if the profile does not exist.
	UpdateAthleteProfile(ctx context.Context, userID string, profile *AthleteProfile) error
}
