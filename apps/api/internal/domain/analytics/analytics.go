package analytics

type DashboardSummary struct {
	RosterMetrics map[string]interface{} `json:"roster_metrics"`
	Upcoming []interface{} `json:"upcoming_appointments"`
	NeedsAttention []interface{} `json:"needs_attention"`
}

type HRZone struct {
	Zone int     `json:"zone"`
	MinBpm int   `json:"min_bpm"`
	MaxBpm int   `json:"max_bpm"`
	Percent int `json:"percent"`
	TimeMinutes int `json:"time_minutes"`
}

type FatigueMap struct {
	Date string `json:"date"`
	FatigueScore float64 `json:"fatigue_score"`
	RecoveryScore float64 `json:"recovery_score"`
	TrainingLoad float64 `json:"training_load"`
}

type OneRM struct {
	ExerciseID string  `json:"exercise_id"`
	ExerciseName string `json:"exercise_name"`
	OneRepMax float64 `json:"one_rep_max"`
	LastUpdated string `json:"last_updated"`
}

type TrainingSummary struct {
	Period string `json:"period"`
	TotalSessions int `json:"total_sessions"`
	TotalVolume float64 `json:"total_volume"`
	AvgIntensity float64 `json:"avg_intensity"`
}

type Effort struct {
	SessionID string `json:"session_id"`
	EffortScore float64 `json:"effort_score"`
	RPE int `json:"rpe"`
	DurationMinutes int `json:"duration_minutes"`
}
