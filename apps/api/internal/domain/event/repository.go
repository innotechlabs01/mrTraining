package event

import "context"

// Repository defines the data access interface for the event domain.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type Repository interface {
	// ListByCoach retrieves all events for a given coach, ordered by date.
	// Returns an empty slice (not nil) if no events exist.
	ListByCoach(ctx context.Context, coachID string) ([]*Event, error)

	// GetByID retrieves an event by its unique identifier.
	// Returns ErrNotFound if no event exists with the given ID.
	GetByID(ctx context.Context, id string) (*Event, error)

	// Create inserts a new event record.
	Create(ctx context.Context, event *Event) error

	// Update modifies an existing event record.
	// Returns ErrNotFound if the event does not exist.
	Update(ctx context.Context, event *Event) error

	// Delete removes an event record by ID.
	// Returns ErrNotFound if the event does not exist.
	Delete(ctx context.Context, id string) error

	// GetRegistration retrieves a specific athlete's registration for an event.
	// Returns ErrNotFound if no registration exists.
	GetRegistration(ctx context.Context, eventID, athleteID string) (*EventRegistration, error)

	// UpsertRegistration creates or updates an athlete's registration for an event.
	UpsertRegistration(ctx context.Context, reg *EventRegistration) error

	// ListRegistrationsByAthlete retrieves all events an athlete is registered for.
	ListRegistrationsByAthlete(ctx context.Context, athleteID string) ([]*Event, error)

	// SetAthletes replaces the athlete list for an event.
	SetAthletes(ctx context.Context, eventID string, athleteIDs []string) error

	// SetFormFields replaces the form fields for an event.
	SetFormFields(ctx context.Context, eventID string, fields []EventFormField) error

	// SetListItems replaces the list items for an event.
	SetListItems(ctx context.Context, eventID string, items []string) error
}
