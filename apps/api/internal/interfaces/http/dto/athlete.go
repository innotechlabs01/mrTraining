package dto

// AthleteResponse represents an athlete profile in API responses.
type AthleteResponse struct {
	ID              string            `json:"id"`
	UserID          string            `json:"user_id"`
	PrimarySport    string            `json:"primary_sport"`
	TrainingStatus  string            `json:"training_status"`
	InjuryStatus    string            `json:"injury_status"`
	AssignedCoaches []CoachAssignment `json:"assigned_coaches"`
	MetricsSummary  *MetricsSummary   `json:"metrics_summary,omitempty"`
}

// CoachAssignment represents a coach assigned to an athlete.
type CoachAssignment struct {
	CoachID   string `json:"coach_id"`
	CoachName string `json:"coach_name,omitempty"`
	IsPrimary bool   `json:"is_primary"`
}

// MetricsSummary represents high-level metrics for an athlete.
type MetricsSummary struct {
	WeeklyLoad     float64 `json:"weekly_load"`
	AdherencePct   float64 `json:"adherence_pct"`
	ReadinessScore float64 `json:"readiness_score"`
	Acwr           float64 `json:"acwr"`
	LastUpdatedAt  string  `json:"last_updated_at"`
}

// AthleteWorkoutResponse represents a workout summary for an athlete list.
type AthleteWorkoutResponse struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	SportType     string `json:"sport_type"`
	ScheduledDate string `json:"scheduled_date"`
	Status        string `json:"status"`
}

// AthleteWorkoutsResponse is the envelope for GET /athletes/:id/workouts.
type AthleteWorkoutsResponse struct {
	Data  []AthleteWorkoutResponse `json:"data"`
	Total int                      `json:"total"`
}

// AthleteMetricsResponse represents a single time-series metric data point.
type AthleteMetricsResponse struct {
	MetricDate string  `json:"metric_date"`
	WeightKg   float64 `json:"weight_kg,omitempty"`
	RestingHR  int     `json:"resting_hr_bpm,omitempty"`
	Vo2Max     float64 `json:"vo2max_estimate,omitempty"`
}

// AthleteMetricsResponseList is the envelope for GET /athletes/:id/metrics.
type AthleteMetricsResponseList struct {
	Data  []AthleteMetricsResponse `json:"data"`
	Total int                      `json:"total"`
}

// AthleteMessageResponse represents a message thread for an athlete list.
type AthleteMessageResponse struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	CoachName   string `json:"coach_name,omitempty"`
	Subject     string `json:"subject,omitempty"`
	LastMessage string `json:"last_message,omitempty"`
	LastSentAt  string `json:"last_sent_at,omitempty"`
	UnreadCount int    `json:"unread_count"`
	CreatedAt   string `json:"created_at"`
}

// AthleteMessagesResponse is the envelope for GET /athletes/:id/messages.
type AthleteMessagesResponse struct {
	Data  []AthleteMessageResponse `json:"data"`
	Total int                      `json:"total"`
}
