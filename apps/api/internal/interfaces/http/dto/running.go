package dto

// --- Running Request DTOs ---

// LogRunningSessionRequest is the payload for logging a running session.
type LogRunningSessionRequest struct {
	Date      string  `json:"date"`
	Distance  float64 `json:"distance"`   // km
	Duration  int     `json:"duration"`   // seconds
	Pace      string  `json:"pace"`       // "5:30" (optional, calculated if not provided)
	Calories  int     `json:"calories"`
	Elevation float64 `json:"elevation"` // meters
	HeartRate int     `json:"heart_rate"`
	Cadence   int     `json:"cadence"`
	GPSRoute  string  `json:"gps_route,omitempty"`
	Source    string  `json:"source"` // "manual", "apple_watch", "garmin", "healthkit"
}

// ConnectDeviceRequest is the payload for connecting a wearable device.
type ConnectDeviceRequest struct {
	DeviceType string `json:"device_type"` // "apple_watch", "garmin", "healthkit"
}

// --- Running Response DTOs ---

// RunningSessionResponse represents a running session in API responses.
type RunningSessionResponse struct {
	ID        string  `json:"id"`
	Date      string  `json:"date"`
	Distance  float64 `json:"distance"`
	Duration  int     `json:"duration"`
	Pace      string  `json:"pace"`
	Speed     float64 `json:"speed"`
	Calories  int     `json:"calories"`
	Elevation float64 `json:"elevation"`
	HeartRate int     `json:"heart_rate"`
	Cadence   int     `json:"cadence"`
	GPSRoute  string  `json:"gps_route,omitempty"`
	Source    string  `json:"source"`
	CreatedAt string  `json:"created_at"`
}

// RunningStatsResponse represents aggregated running statistics in API responses.
type RunningStatsResponse struct {
	TotalSessions  int     `json:"total_sessions"`
	TotalDistance   float64 `json:"total_distance"`
	TotalDuration   int     `json:"total_duration"`
	TotalCalories   int     `json:"total_calories"`
	TotalElevation  float64 `json:"total_elevation"`
	AvgDistance     float64 `json:"avg_distance"`
	AvgDuration     int     `json:"avg_duration"`
	AvgCalories     int     `json:"avg_calories"`
	AvgHeartRate    int     `json:"avg_heart_rate"`
	AvgPace         string  `json:"avg_pace"`
}

// DeviceConnectionResponse represents a wearable device connection in API responses.
type DeviceConnectionResponse struct {
	ID          string `json:"id"`
	DeviceType  string `json:"device_type"`
	IsActive    bool   `json:"is_active"`
	ConnectedAt string `json:"connected_at"`
}
