package training

// ProgressEntry represents a summary of an athlete's workout completion
// for a specific date range. It aggregates session data to provide
// a high-level view of training progress.
type ProgressEntry struct {
	AthleteID        string  `json:"athlete_id"`
	Date             string  `json:"date"`
	WorkoutsAssigned int     `json:"workouts_assigned"`
	WorkoutsCompleted int    `json:"workouts_completed"`
	TotalSets        int     `json:"total_sets"`
	CompletedSets    int     `json:"completed_sets"`
	AverageWeight    float64 `json:"average_weight"`
	TotalVolume      float64 `json:"total_volume"` // sum of weight * reps
	CompletionRate   float64 `json:"completion_rate"`
}

// ProgressDateRange holds the start and end dates for progress queries.
type ProgressDateRange struct {
	StartDate string
	EndDate   string
}

// ProgressSummary holds aggregated training metrics for a date range,
// including a consecutive-day completion streak ending at EndDate.
type ProgressSummary struct {
	AthleteID         string  `json:"athlete_id"`
	StartDate         string  `json:"start_date"`
	EndDate           string  `json:"end_date"`
	WorkoutsCompleted int     `json:"workouts_completed"`
	TotalVolume       float64 `json:"total_volume"` // sum of weight * reps
	AvgCompletionRate float64 `json:"avg_completion_rate"`
	Streak            int     `json:"streak"` // consecutive completed days ending at EndDate
}
