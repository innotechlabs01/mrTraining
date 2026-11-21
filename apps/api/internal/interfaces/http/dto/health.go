package dto

// RecordMetricRequest is the payload for recording a health metric.
// Supports both snake_case and camelCase JSON fields from mobile/web clients.
type RecordMetricRequest struct {
	MetricType         string  `json:"metric_type"`
	MetricTypeCamel    string  `json:"metricType"`
	Value              float64 `json:"value"`
	Unit               string  `json:"unit"`
	Source             string  `json:"source"`
	SourceWorkoutID    *string `json:"source_workout_id,omitempty"`
	SourceWorkoutIDCam *string `json:"sourceWorkoutId,omitempty"`
	RecordedAt         string  `json:"recorded_at"`
	RecordedAtCamel    string  `json:"recordedAt"`
}

// RecordSleepRequest is the payload for recording a sleep log.
// Supports both snake_case and camelCase JSON fields from mobile/web clients.
type RecordSleepRequest struct {
	Date              string   `json:"date"`
	TotalMinutes      int      `json:"total_minutes"`
	TotalMinutesCamel int      `json:"totalMinutes"`
	DeepMinutes       *int     `json:"deep_minutes,omitempty"`
	DeepMinutesCamel  *int     `json:"deepMinutes,omitempty"`
	RemMinutes        *int     `json:"rem_minutes,omitempty"`
	RemMinutesCamel   *int     `json:"remMinutes,omitempty"`
	LightMinutes      *int     `json:"light_minutes,omitempty"`
	LightMinutesCamel *int     `json:"lightMinutes,omitempty"`
	AwakeMinutes      *int     `json:"awake_minutes,omitempty"`
	AwakeMinutesCamel *int     `json:"awakeMinutes,omitempty"`
	Efficiency        *float64 `json:"efficiency,omitempty"`
	Score             *int     `json:"score,omitempty"`
	Source            string   `json:"source"`
}

// RegisterHealthDeviceRequest is the payload for registering a wearable device.
// Supports both snake_case and camelCase JSON fields.
type RegisterHealthDeviceRequest struct {
	Platform         string `json:"platform"`
	DeviceName       string `json:"device_name"`
	DeviceNameCamel  string `json:"deviceName"`
	DeviceBrand      string `json:"device_brand"`
	DeviceBrandCamel string `json:"deviceBrand"`
}
