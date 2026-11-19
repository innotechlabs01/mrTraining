package athlete

import "context"

// Repository defines the data access interface for the Athlete aggregate.
// Implementations live in the infrastructure layer.
type Repository interface {
	// GetByID retrieves an Athlete aggregate by its unique identifier.
	// Returns ErrNotFound if no athlete exists with the given ID.
	GetByID(ctx context.Context, id string) (*Athlete, error)

	// GetWorkouts retrieves workout summaries for an athlete.
	// Returns an empty slice (not nil) if no workouts exist.
	GetWorkouts(ctx context.Context, athleteID string) ([]*WorkoutSummary, error)

	// GetMetrics retrieves time-series metrics for an athlete.
	// Returns an empty slice (not nil) if no metrics exist.
	GetMetrics(ctx context.Context, athleteID string) ([]*MetricPoint, error)

	// GetMessages retrieves message threads for an athlete.
	// Returns an empty slice (not nil) if no threads exist.
	GetMessages(ctx context.Context, athleteID string) ([]*MessageThread, error)
}

// WorkoutSummary is a lightweight workout read model for athlete lists.
type WorkoutSummary struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	SportType     string `json:"sport_type"`
	ScheduledDate string `json:"scheduled_date"`
	Status        string `json:"status"`
}

// MetricPoint is a single time-series metric data point.
type MetricPoint struct {
	MetricDate string  `json:"metric_date"`
	WeightKg   float64 `json:"weight_kg,omitempty"`
	RestingHR  int     `json:"resting_hr_bpm,omitempty"`
	Vo2Max     float64 `json:"vo2max_estimate,omitempty"`
}

// MessageThread is a lightweight message thread read model.
type MessageThread struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	CoachName   string `json:"coach_name,omitempty"`
	Subject     string `json:"subject,omitempty"`
	LastMessage string `json:"last_message,omitempty"`
	LastSentAt  string `json:"last_sent_at,omitempty"`
	UnreadCount int    `json:"unread_count"`
	CreatedAt   string `json:"created_at"`
}
