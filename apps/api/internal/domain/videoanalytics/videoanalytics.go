package videoanalytics

// SessionAnalysis represents a video analysis session.
type SessionAnalysis struct {
	ID           string  `json:"id"`
	AthleteID    string  `json:"athlete_id"`
	WorkoutID    string  `json:"workout_id"`
	ExerciseID   string  `json:"exercise_id"`
	ExerciseName string  `json:"exercise_name"`
	DurationSec  int     `json:"duration_sec"`
	RepCount     int     `json:"rep_count"`
	AvgFormScore float64 `json:"avg_form_score"`
	MinFormScore float64 `json:"min_form_score"`
	MaxFormScore float64 `json:"max_form_score"`
	VideoURL     string  `json:"video_url"`
	Status       string  `json:"status"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// ExerciseAnalytics represents aggregated analytics per exercise.
type ExerciseAnalytics struct {
	ExerciseID    string  `json:"exercise_id"`
	ExerciseName  string  `json:"exercise_name"`
	TotalSessions int     `json:"total_sessions"`
	TotalReps     int     `json:"total_reps"`
	AvgFormScore  float64 `json:"avg_form_score"`
	BestFormScore float64 `json:"best_form_score"`
	AvgDuration   float64 `json:"avg_duration"`
}

// AnalyticsSummary represents a summary of all analytics.
type AnalyticsSummary struct {
	TotalSessions    int     `json:"total_sessions"`
	TotalReps        int     `json:"total_reps"`
	AvgFormScore     float64 `json:"avg_form_score"`
	TotalDurationMin int     `json:"total_duration_min"`
	ExerciseCount    int     `json:"exercise_count"`
}
