package running

import (
	"context"
	"time"
)

// WearableProvider defines the interface for syncing data from wearable devices.
// Each provider (Apple Watch, Garmin, HealthKit) implements this interface.
// This is an adapter pattern — the domain defines the contract, infrastructure provides implementations.
type WearableProvider interface {
	// Name returns the provider's identifier (e.g., "apple_watch", "garmin", "healthkit").
	Name() string

	// IsAvailable checks if the provider is configured and reachable.
	IsAvailable(ctx context.Context) bool

	// FetchSessions retrieves running sessions from the provider for a user within a date range.
	FetchSessions(ctx context.Context, userID string, from, to time.Time) ([]RunningSession, error)

	// SyncHealthData retrieves health metrics (HRV, resting HR, steps, sleep) from the provider.
	SyncHealthData(ctx context.Context, userID string) (*HealthData, error)
}

// HealthData represents aggregated health metrics from a wearable provider.
type HealthData struct {
	HRV        float64 `json:"hrv"`         // Heart Rate Variability (ms)
	RestingHR  int     `json:"resting_hr"`  // Resting heart rate (bpm)
	Steps      int     `json:"steps"`       // Daily step count
	SleepHours float64 `json:"sleep_hours"` // Hours of sleep
}
