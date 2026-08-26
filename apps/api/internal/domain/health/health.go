// Package health defines health-related domain entities for wearable metrics and sleep tracking.
package health

// HealthMetric represents a single wearable measurement (HRV, resting HR, steps, etc.).
type HealthMetric struct {
	ID              string  `json:"id"`
	AthleteID       string  `json:"athlete_id"`
	MetricType      string  `json:"metric_type"`
	Value           float64 `json:"value"`
	Unit            string  `json:"unit"`
	Source          string  `json:"source"`
	SourceWorkoutID *string `json:"source_workout_id,omitempty"`
	RecordedAt      string  `json:"recorded_at"`
	SyncedAt        string  `json:"synced_at"`
}

// SleepLog represents a single night of sleep data.
type SleepLog struct {
	ID           string  `json:"id"`
	AthleteID    string  `json:"athlete_id"`
	Date         string  `json:"date"`
	TotalMinutes int     `json:"total_minutes"`
	DeepMinutes  *int    `json:"deep_minutes,omitempty"`
	RemMinutes   *int    `json:"rem_minutes,omitempty"`
	LightMinutes *int    `json:"light_minutes,omitempty"`
	AwakeMinutes *int    `json:"awake_minutes,omitempty"`
	Efficiency   *float64 `json:"efficiency,omitempty"`
	Score        *int    `json:"score,omitempty"`
	Source       string  `json:"source"`
}

// HealthDevice represents a registered wearable device.
type HealthDevice struct {
	ID           string `json:"id"`
	AthleteID    string `json:"athlete_id"`
	Platform     string `json:"platform"`
	DeviceName   string `json:"device_name"`
	DeviceBrand  string `json:"device_brand"`
	IsActive     bool   `json:"is_active"`
	LastSyncAt   *string `json:"last_sync_at,omitempty"`
	CreatedAt    string `json:"created_at"`
}
