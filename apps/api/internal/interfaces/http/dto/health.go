package dto

// RecordMetricRequest is the payload for recording a health metric.
type RecordMetricRequest struct {
	MetricType      string  `json:"metric_type"`
	Value           float64 `json:"value"`
	Unit            string  `json:"unit"`
	Source          string  `json:"source"`
	SourceWorkoutID *string `json:"source_workout_id,omitempty"`
	RecordedAt      string  `json:"recorded_at"`
}

// RecordSleepRequest is the payload for recording a sleep log.
type RecordSleepRequest struct {
	Date         string   `json:"date"`
	TotalMinutes int      `json:"total_minutes"`
	DeepMinutes  *int     `json:"deep_minutes,omitempty"`
	RemMinutes   *int     `json:"rem_minutes,omitempty"`
	LightMinutes *int     `json:"light_minutes,omitempty"`
	AwakeMinutes *int     `json:"awake_minutes,omitempty"`
	Efficiency   *float64 `json:"efficiency,omitempty"`
	Score        *int     `json:"score,omitempty"`
	Source       string   `json:"source"`
}

// RegisterHealthDeviceRequest is the payload for registering a wearable device.
type RegisterHealthDeviceRequest struct {
	Platform    string `json:"platform"`
	DeviceName  string `json:"device_name"`
	DeviceBrand string `json:"device_brand"`
}
