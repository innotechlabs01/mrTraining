package membership

import "context"

// Repository defines the data access interface for the membership domain.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type Repository interface {
	// GetByAthleteID retrieves the most recent membership for an athlete.
	// Returns ErrNotFound if no membership exists.
	GetByAthleteID(ctx context.Context, athleteID string) (*Membership, error)

	// GetByID retrieves a membership by its unique identifier.
	// Returns ErrNotFound if no membership exists with the given ID.
	GetByID(ctx context.Context, id string) (*Membership, error)

	// Create inserts a new membership record.
	Create(ctx context.Context, m *Membership) error

	// Update modifies an existing membership record.
	Update(ctx context.Context, m *Membership) error

	// Cancel sets a membership status to "cancelled".
	// Returns ErrNotFound if no membership exists with the given ID.
	Cancel(ctx context.Context, id string) error

	// ListByCoach retrieves all memberships for athletes of a specific coach.
	// Returns an empty slice (not nil) if no memberships exist.
	ListByCoach(ctx context.Context, coachID string) ([]*Membership, error)

	// GetPaymentHistory retrieves payment records for an athlete, ordered by most recent.
	// Returns an empty slice (not nil) if no payments exist.
	GetPaymentHistory(ctx context.Context, athleteID string) ([]*Payment, error)

	// RecordPayment inserts a new payment record.
	RecordPayment(ctx context.Context, p *Payment) error
}
