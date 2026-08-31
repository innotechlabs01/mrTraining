package dto

// --- Coach Request DTOs ---

// SaveTimeBlocksRequest is the payload for saving time blocks.
type SaveTimeBlocksRequest struct {
	Blocks []TimeBlockRequest `json:"blocks"`
}

// TimeBlockRequest is a single time block in the save request.
type TimeBlockRequest struct {
	Title      string `json:"title"`
	BlockType  string `json:"block_type"`
	StartTime  string `json:"start_time"`
	EndTime    string `json:"end_time"`
	Recurrence string `json:"recurrence"`
	Color      string `json:"color"`
}

// CreateAppointmentRequest is the payload for creating an appointment.
type CreateAppointmentRequest struct {
	AthleteID   string `json:"athlete_id"`
	AthleteName string `json:"athlete_name"`
	Title       string `json:"title"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Notes       string `json:"notes"`
}

// UpdateAppointmentRequest is the payload for updating an appointment.
type UpdateAppointmentRequest struct {
	Status string `json:"status"`
	Notes  string `json:"notes"`
}

// SaveAvailabilityRequest is the payload for saving availability slots.
type SaveAvailabilityRequest struct {
	Slots []AvailabilitySlotRequest `json:"slots"`
}

// AvailabilitySlotRequest is a single availability slot.
type AvailabilitySlotRequest struct {
	DayOfWeek int    `json:"day_of_week"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	IsActive  bool   `json:"is_active"`
}

// --- Coach Response DTOs ---

// DashboardResponse represents coach dashboard metrics.
type DashboardResponse struct {
	TotalAthletes    int     `json:"total_athletes"`
	ActiveWorkouts   int     `json:"active_workouts"`
	CompletionRate   float64 `json:"completion_rate"`
	UpcomingSessions int     `json:"upcoming_sessions"`
	RevenueThisMonth float64 `json:"revenue_this_month"`
}

// DailySummaryResponse represents a coach's daily summary.
type DailySummaryResponse struct {
	Date           string `json:"date"`
	SessionsToday  int    `json:"sessions_today"`
	AthletesToday  int    `json:"athletes_today"`
	CompletedToday int    `json:"completed_today"`
	PendingTasks   int    `json:"pending_tasks"`
}

// TimeBlockResponse represents a time block in API responses.
type TimeBlockResponse struct {
	ID         string `json:"id"`
	CoachID    string `json:"coach_id"`
	Title      string `json:"title"`
	BlockType  string `json:"block_type"`
	StartTime  string `json:"start_time"`
	EndTime    string `json:"end_time"`
	Recurrence string `json:"recurrence,omitempty"`
	Color      string `json:"color,omitempty"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

// AppointmentResponse represents an appointment in API responses.
type AppointmentResponse struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	AthleteID   string `json:"athlete_id"`
	AthleteName string `json:"athlete_name,omitempty"`
	Title       string `json:"title"`
	Status      string `json:"status"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Notes       string `json:"notes,omitempty"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// AvailabilitySlotResponse represents an availability slot in API responses.
type AvailabilitySlotResponse struct {
	ID        string `json:"id"`
	CoachID   string `json:"coach_id"`
	DayOfWeek int    `json:"day_of_week"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}
