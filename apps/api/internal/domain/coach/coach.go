// Package coach defines the core coach domain entities for the MR Training API.
// It includes TimeBlock, Appointment, CoachAvailability, and Dashboard types.
package coach

// TimeBlock represents a scheduled time block in a coach's calendar.
type TimeBlock struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	Title       string `json:"title"`
	BlockType   string `json:"block_type"`   // "session", "admin", "break", "personal"
	StartTime   string `json:"start_time"`   // ISO 8601
	EndTime     string `json:"end_time"`     // ISO 8601
	Recurrence  string `json:"recurrence,omitempty"` // "none", "daily", "weekly"
	Color       string `json:"color,omitempty"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// Appointment represents a scheduled appointment between a coach and athlete.
type Appointment struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	AthleteID   string `json:"athlete_id"`
	AthleteName string `json:"athlete_name,omitempty"`
	Title       string `json:"title"`
	Status      string `json:"status"` // "scheduled", "completed", "cancelled", "no_show"
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Notes       string `json:"notes,omitempty"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// CoachAvailability represents available time slots for a coach.
type CoachAvailability struct {
	ID        string `json:"id"`
	CoachID   string `json:"coach_id"`
	DayOfWeek int    `json:"day_of_week"` // 0=Sunday, 6=Saturday
	StartTime string `json:"start_time"`  // "HH:MM"
	EndTime   string `json:"end_time"`    // "HH:MM"
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

// Dashboard represents aggregated coach dashboard metrics.
type Dashboard struct {
	TotalAthletes     int     `json:"total_athletes"`
	ActiveWorkouts    int     `json:"active_workouts"`
	CompletionRate    float64 `json:"completion_rate"`
	UpcomingSessions  int     `json:"upcoming_sessions"`
	RevenueThisMonth  float64 `json:"revenue_this_month"`
}

// DailySummary represents a coach's daily summary.
type DailySummary struct {
	Date              string `json:"date"`
	SessionsToday     int    `json:"sessions_today"`
	AthletesToday     int    `json:"athletes_today"`
	CompletedToday    int    `json:"completed_today"`
	PendingTasks      int    `json:"pending_tasks"`
}
