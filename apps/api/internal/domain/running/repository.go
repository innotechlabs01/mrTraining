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

	// Device provenance operations

	// SaveSessionDevice records which wearable wrote a session. ExternalID is
	// unique per user, so a repeated sync must not create a second row.
	SaveSessionDevice(ctx context.Context, session *RunningSession) error

	// GetSessionIDByExternalID returns the session already imported for a
	// device workout id. Returns ("", false, nil) when it has not been imported.
	GetSessionIDByExternalID(ctx context.Context, userID, externalID string) (string, bool, error)

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

	// --- Running workout template operations ---

	// SaveTemplate persists a running workout template with its segments.
	SaveTemplate(ctx context.Context, t *RunningWorkoutTemplate) error

	// GetTemplate retrieves a template by ID with its segments.
	GetTemplate(ctx context.Context, id string) (*RunningWorkoutTemplate, error)

	// ListTemplatesByCoach retrieves all non-deleted templates for a coach.
	ListTemplatesByCoach(ctx context.Context, coachID string) ([]*RunningWorkoutTemplate, error)

	// DeleteTemplate soft-deletes a template (sets deleted_at).
	DeleteTemplate(ctx context.Context, id string) error

	// SaveSegment persists a running workout segment.
	SaveSegment(ctx context.Context, s *RunningWorkoutSegment) error

	// ListSegmentsByTemplate retrieves all non-deleted segments for a template, ordered by order_index.
	ListSegmentsByTemplate(ctx context.Context, templateID string) ([]*RunningWorkoutSegment, error)

	// --- Running workout assignment operations ---

	// SaveAssignment persists a running workout assignment.
	SaveAssignment(ctx context.Context, a *RunningWorkoutAssignment) error

	// GetAssignment retrieves an assignment by ID.
	GetAssignment(ctx context.Context, id string) (*RunningWorkoutAssignment, error)

	// ListAssignmentsByAthlete retrieves assignments for an athlete, optionally filtered by status.
	ListAssignmentsByAthlete(ctx context.Context, athleteID string, status RunningWorkoutAssignmentStatus) ([]*RunningWorkoutAssignment, error)

	// ListAssignmentsByCoach retrieves assignments created by a coach.
	ListAssignmentsByCoach(ctx context.Context, coachID string) ([]*RunningWorkoutAssignment, error)

	// UpdateAssignmentStatus changes the status of an assignment.
	UpdateAssignmentStatus(ctx context.Context, id string, status RunningWorkoutAssignmentStatus) error

	// --- Running workout snapshot operations ---

	// SaveSnapshot persists an immutable prescription snapshot captured at session start.
	SaveSnapshot(ctx context.Context, s *RunningWorkoutSnapshot) error

	// GetSnapshotBySession retrieves the snapshot for a given session ID.
	GetSnapshotBySession(ctx context.Context, sessionID string) (*RunningWorkoutSnapshot, error)
}
