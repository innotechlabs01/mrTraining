package running

import "context"

// Repository defines the data access interface for the running domain.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type Repository interface {
	// Session operations

	// SaveSession persists a running session record.
	SaveSession(ctx context.Context, session *RunningSession) error

	// GetSession retrieves a session by its unique identifier.
	// Returns ErrNotFound if no session exists with the given ID.
	GetSession(ctx context.Context, id string) (*RunningSession, error)

	// ListSessionsByUser retrieves running sessions for a user within an optional date range,
	// ordered by date descending. Supports offset-based pagination via limit and offset.
	ListSessionsByUser(ctx context.Context, userID string, fromDate, toDate string, limit, offset int) ([]*RunningSession, error)

	// CountSessionsByUser returns the total number of sessions for a user within an optional date range.
	CountSessionsByUser(ctx context.Context, userID string, fromDate, toDate string) (int, error)

	// UpdateSession persists final metrics of an existing running session
	// (used to close a live-tracked run with totals).
	// Returns ErrNotFound if no session exists with the given ID.
	UpdateSession(ctx context.Context, session *RunningSession) error

	// DeleteSession removes a running session by ID.
	// Returns an error if the session does not exist or on database failure.
	DeleteSession(ctx context.Context, id string) error

	// GPS point operations

	// SaveGpsPoint persists a single GPS sample for a running session.
	SaveGpsPoint(ctx context.Context, point *GpsPoint) error

	// SaveGpsPoints persists a batch of GPS samples in a single transaction.
	SaveGpsPoints(ctx context.Context, points []*GpsPoint) error

	// ListGpsPointsBySession returns all GPS points for a session ordered by timestamp ascending.
	ListGpsPointsBySession(ctx context.Context, sessionID string) ([]*GpsPoint, error)

	// Device connection operations

	// SaveDeviceConnection stores a device connection record.
	SaveDeviceConnection(ctx context.Context, conn *DeviceConnection) error

	// GetDeviceConnection retrieves a device connection by its unique identifier.
	GetDeviceConnection(ctx context.Context, id string) (*DeviceConnection, error)

	// ListDeviceConnectionsByUser retrieves all device connections for a user.
	ListDeviceConnectionsByUser(ctx context.Context, userID string) ([]*DeviceConnection, error)

	// DeactivateDeviceConnection marks a device connection as inactive.
	DeactivateDeviceConnection(ctx context.Context, id string) error
}
