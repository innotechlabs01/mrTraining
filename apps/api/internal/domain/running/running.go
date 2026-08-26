// Package running defines the core running domain entities for the MR Training API.
// It includes RunningSession, DeviceConnection, and HealthData types for wearable integrations.
package running

// RunningSession represents a single running activity logged by an athlete.
// Sessions can be entered manually or synced from wearable devices.
type RunningSession struct {
	ID        string  `json:"id"`
	UserID    string  `json:"user_id"`
	Date      string  `json:"date"`
	Distance  float64 `json:"distance"`   // km
	Duration  int     `json:"duration"`   // seconds
	Pace      string  `json:"pace"`       // "5:30" (min/km)
	Speed     float64 `json:"speed"`      // km/h
	Calories  int     `json:"calories"`
	Elevation float64 `json:"elevation"` // meters
	HeartRate int     `json:"heart_rate"`
	Cadence   int     `json:"cadence"`
	GPSRoute  string  `json:"gps_route,omitempty"` // encoded polyline
	Source    string  `json:"source"`              // "manual", "apple_watch", "garmin", "healthkit"
	CreatedAt string  `json:"created_at"`
}

// DeviceConnection represents a linked wearable device for a user.
// The connection tracks device type and active status.
type DeviceConnection struct {
	ID          string `json:"id"`
	UserID      string `json:"user_id"`
	DeviceType  string `json:"device_type"` // "apple_watch", "garmin", "healthkit"
	IsActive    bool   `json:"is_active"`
	ConnectedAt string `json:"connected_at"`
}
