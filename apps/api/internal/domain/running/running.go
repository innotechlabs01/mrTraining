// Package running defines the core running domain entities for the MR Training API.
// It includes RunningSession, DeviceConnection, and HealthData types for wearable integrations.
package running

// RunningSession represents a single running activity logged by an athlete.
// Sessions can be entered manually or synced from wearable devices.
type RunningSession struct {
	ID        string  `json:"id"`
	UserID    string  `json:"user_id"`
	Date      string  `json:"date"`
	Distance  float64 `json:"distance"` // km
	Duration  int     `json:"duration"` // seconds
	Pace      string  `json:"pace"`     // "5:30" (min/km)
	Speed     float64 `json:"speed"`    // km/h
	Calories  int     `json:"calories"`
	Elevation float64 `json:"elevation"` // meters
	HeartRate int     `json:"heart_rate"`
	Cadence   int     `json:"cadence"`
	GPSRoute  string  `json:"gps_route,omitempty"` // encoded polyline
	Source    string  `json:"source"`              // "manual", "mobile_gps", "apple_watch", "garmin", "health_connect"
	CreatedAt string  `json:"created_at"`

	// Device provenance. Only device-recorded sessions carry these; they live in
	// running_session_devices so the recording watch stays identifiable.
	ExternalID  string `json:"external_id,omitempty"`  // the device's own workout id
	DeviceName  string `json:"device_name,omitempty"`  // "Apple Watch de Juan", "Forerunner 265"
	DeviceBrand string `json:"device_brand,omitempty"` // "Apple", "Garmin"
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

// Canonical sources for device-recorded sessions. Anything else is rejected by
// the import service so a client cannot invent a provenance.
const (
	SourceAppleWatch    = "apple_watch"
	SourceGarmin        = "garmin"
	SourceHealthConnect = "health_connect"
	SourcePhone         = "phone"
	SourceManual        = "manual"
	SourceMobileGPS     = "mobile_gps"
)

// IsDeviceSource reports whether source identifies a wearable that recorded the
// session (as opposed to the athlete typing it in or the app's own GPS).
func IsDeviceSource(source string) bool {
	switch source {
	case SourceAppleWatch, SourceGarmin, SourceHealthConnect, SourcePhone:
		return true
	}
	return false
}

// GpsPoint represents a single GPS sample recorded during a running session.
// Latitude and longitude are stored as float64 decimal degrees.
// Timestamp is RFC3339 UTC. Accuracy is in meters.
type GpsPoint struct {
	ID        string  `json:"id"`
	SessionID string  `json:"session_id"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Alt       float64 `json:"alt,omitempty"`      // meters
	Timestamp string  `json:"timestamp"`          // RFC3339 UTC
	Accuracy  float64 `json:"accuracy,omitempty"` // meters
}
