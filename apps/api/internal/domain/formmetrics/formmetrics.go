package formmetrics

// FormMetric represents a single form analysis metric entry.
type FormMetric struct {
	ID           string  `json:"id"`
	AthleteID    string  `json:"athlete_id"`
	ExerciseID   string  `json:"exercise_id"`
	ExerciseName string  `json:"exercise_name"`
	WorkoutID    string  `json:"workout_id,omitempty"`
	FormScore    float64 `json:"form_score"`
	Depth        float64 `json:"depth"`
	Alignment    float64 `json:"alignment"`
	Tempo        float64 `json:"tempo"`
	RecordedAt   string  `json:"recorded_at"`
}

// ExerciseFormStats represents aggregated form stats per exercise.
type ExerciseFormStats struct {
	ExerciseID   string            `json:"exercise_id"`
	ExerciseName string            `json:"exercise_name"`
	LatestScore  float64           `json:"latest_score"`
	AvgScore     float64           `json:"avg_score"`
	BestScore    float64           `json:"best_score"`
	WorstScore   float64           `json:"worst_score"`
	Trend        string            `json:"trend"` // improving, declining, stable
	Sessions     int               `json:"sessions"`
	AvgDepth     float64           `json:"avg_depth"`
	AvgAlignment float64           `json:"avg_alignment"`
	AvgTempo     float64           `json:"avg_tempo"`
	History      []HistoryEntry    `json:"history"`
}

// HistoryEntry represents a single score point in time.
type HistoryEntry struct {
	Date  string  `json:"date"`
	Score float64 `json:"score"`
}

// BatchSyncRequest is the payload for batch metric sync.
type BatchSyncRequest struct {
	Metrics []FormMetric `json:"metrics"`
}

// BatchSyncResponse is the response after batch sync.
type BatchSyncResponse struct {
	Synced  int `json:"synced"`
	Failed  int `json:"failed"`
}
