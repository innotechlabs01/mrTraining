package coach

import "context"

// Repository defines the data access interface for the coach domain.
type Repository interface {
	// Dashboard

	// GetDashboard retrieves aggregated dashboard metrics for a coach.
	GetDashboard(ctx context.Context, coachID string) (*Dashboard, error)

	// GetDailySummary retrieves today's summary for a coach.
	GetDailySummary(ctx context.Context, coachID string) (*DailySummary, error)

	// TimeBlocks

	// GetTimeBlocks retrieves all time blocks for a coach.
	GetTimeBlocks(ctx context.Context, coachID string) ([]*TimeBlock, error)

	// SaveTimeBlocks replaces all time blocks for a coach (transactional delete + insert).
	SaveTimeBlocks(ctx context.Context, coachID string, blocks []*TimeBlock) error

	// Appointments

	// GetAppointments retrieves all appointments for a coach.
	GetAppointments(ctx context.Context, coachID string) ([]*Appointment, error)

	// CreateAppointment creates a new appointment.
	CreateAppointment(ctx context.Context, apt *Appointment) error

	// UpdateAppointment updates an appointment's status and notes.
	UpdateAppointment(ctx context.Context, id string, apt *Appointment) error

	// Availability

	// GetAvailability retrieves availability slots for a coach.
	GetAvailability(ctx context.Context, coachID string) ([]*CoachAvailability, error)

	// SaveAvailability replaces all availability slots for a coach (transactional delete + insert).
	SaveAvailability(ctx context.Context, coachID string, slots []*CoachAvailability) error
}
