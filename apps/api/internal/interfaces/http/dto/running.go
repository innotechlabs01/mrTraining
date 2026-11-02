package dto

// --- Running Request DTOs ---

// LogRunningSessionRequest is the payload for logging a running session.
type LogRunningSessionRequest struct {
	Date      string  `json:"date"`
	Distance  float64 `json:"distance"` // km
	Duration  int     `json:"duration"` // seconds
	Pace      string  `json:"pace"`     // "5:30" (optional, calculated if not provided)
	Calories  int     `json:"calories"`
	Elevation float64 `json:"elevation"` // meters
	HeartRate int     `json:"heart_rate"`
	Cadence   int     `json:"cadence"`
	GPSRoute  string  `json:"gps_route,omitempty"`
	Source    string  `json:"source"` // "manual", "apple_watch", "garmin", "healthkit"
}

// ImportDeviceSessionRequest is one device-recorded run. ExternalID is the
// watch's own workout id and makes the import idempotent.
type ImportDeviceSessionRequest struct {
	ExternalID  string               `json:"external_id"`
	Source      string               `json:"source"` // apple_watch | garmin | health_connect | phone
	DeviceName  string               `json:"device_name"`
	DeviceBrand string               `json:"device_brand"`
	Date        string               `json:"date"` // YYYY-MM-DD
	Distance    float64              `json:"distance"`
	Duration    int                  `json:"duration"`
	Pace        string               `json:"pace,omitempty"`
	Calories    int                  `json:"calories,omitempty"`
	Elevation   float64              `json:"elevation,omitempty"`
	HeartRate   int                  `json:"heart_rate,omitempty"`
	Cadence     int                  `json:"cadence,omitempty"`
	GPSRoute    string               `json:"gps_route,omitempty"`
	Points      []LogGpsPointRequest `json:"points,omitempty"`
}

// ImportDeviceSessionsRequest is the payload for importing runs recorded on a
// wearable. Max 50 sessions per request; GPS points max 5000 per session.
type ImportDeviceSessionsRequest struct {
	Sessions []ImportDeviceSessionRequest `json:"sessions"`
}

// ImportDeviceSessionsResponse reports what the import did. Sessions already
// stored (same external_id) or unusable ones are counted in skipped.
type ImportDeviceSessionsResponse struct {
	Imported int                      `json:"imported"`
	Skipped  int                      `json:"skipped"`
	Sessions []RunningSessionResponse `json:"sessions"`
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

	// Which wearable recorded the session (empty for manual/mobile_gps runs).
	ExternalID  string `json:"external_id,omitempty"`
	DeviceName  string `json:"device_name,omitempty"`
	DeviceBrand string `json:"device_brand,omitempty"`
}

// RunningStatsResponse represents aggregated running statistics in API responses.
type RunningStatsResponse struct {
	TotalSessions  int     `json:"total_sessions"`
	TotalDistance  float64 `json:"total_distance"`
	TotalDuration  int     `json:"total_duration"`
	TotalCalories  int     `json:"total_calories"`
	TotalElevation float64 `json:"total_elevation"`
	AvgDistance    float64 `json:"avg_distance"`
	AvgDuration    int     `json:"avg_duration"`
	AvgCalories    int     `json:"avg_calories"`
	AvgHeartRate   int     `json:"avg_heart_rate"`
	AvgPace        string  `json:"avg_pace"`
}

// DeviceConnectionResponse represents a wearable device connection in API responses.
type DeviceConnectionResponse struct {
	ID          string `json:"id"`
	DeviceType  string `json:"device_type"`
	IsActive    bool   `json:"is_active"`
	ConnectedAt string `json:"connected_at"`
}

// LogGpsPointRequest is the payload for recording a single GPS sample of a running session.
type LogGpsPointRequest struct {
	SessionID string  `json:"session_id"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Alt       float64 `json:"alt,omitempty"`      // meters
	Timestamp string  `json:"timestamp"`          // RFC3339 UTC
	Accuracy  float64 `json:"accuracy,omitempty"` // meters
}

// LogGpsBatchRequest is the payload for recording a batch of GPS samples in
// one live-location request (client-side batching: one POST per 15s/20m).
type LogGpsBatchRequest struct {
	SessionID string               `json:"session_id"`
	Points    []LogGpsPointRequest `json:"points"` // max 100, server-enforced
}

// UpdateRunningSessionRequest is the payload for closing a live-tracked run
// with its final totals. All fields optional; only provided fields update.
type UpdateRunningSessionRequest struct {
	Distance  *float64 `json:"distance,omitempty"` // km
	Duration  *int     `json:"duration,omitempty"` // seconds
	Pace      *string  `json:"pace,omitempty"`     // "5:30"; recalculated when omitted
	Calories  *int     `json:"calories,omitempty"`
	Elevation *float64 `json:"elevation,omitempty"` // meters
	HeartRate *int     `json:"heart_rate,omitempty"`
	Cadence   *int     `json:"cadence,omitempty"`
	GPSRoute  *string  `json:"gps_route,omitempty"` // encoded polyline
}

// GpsPointResponse represents a single GPS point in API responses.
type GpsPointResponse struct {
	ID        string  `json:"id"`
	SessionID string  `json:"session_id"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Alt       float64 `json:"alt,omitempty"`
	Timestamp string  `json:"timestamp"`
	Accuracy  float64 `json:"accuracy,omitempty"`
}

// RunningSessionDetailResponse represents a running session with its GPS points.
type RunningSessionDetailResponse struct {
	RunningSessionResponse
	GpsPoints []GpsPointResponse `json:"gps_points"`
}

// --- Structured running workout DTOs ---

// CreateRunningWorkoutTemplateRequest is the payload for creating a running
// workout template with ordered segments.
type CreateRunningWorkoutTemplateRequest struct {
	Name                  string                             `json:"name"`
	Description           string                             `json:"description,omitempty"`
	Type                  string                             `json:"type"` // free_run | continuous_distance | timed_run | intervals | series | recovery | tempo | progressive
	TargetPaceMinPerKm    *float64                           `json:"target_pace_min_per_km,omitempty"`
	TargetPaceMaxPerKm    *float64                           `json:"target_pace_max_per_km,omitempty"`
	TargetHeartRateMin    *int                               `json:"target_heart_rate_min,omitempty"`
	TargetHeartRateMax    *int                               `json:"target_heart_rate_max,omitempty"`
	TargetCadence         *int                               `json:"target_cadence,omitempty"`
	TargetDistanceKm      *float64                           `json:"target_distance_km,omitempty"`
	TargetDurationSec     *int                               `json:"target_duration_sec,omitempty"`
	Segments              []CreateRunningWorkoutSegmentRequest `json:"segments"`
}

// CreateRunningWorkoutSegmentRequest is one segment within a template.
type CreateRunningWorkoutSegmentRequest struct {
	OrderIndex           int     `json:"order_index"`
	Type                 string  `json:"type"` // warmup | main | interval | recovery | cooldown
	Instruction          string  `json:"instruction"`
	SpokenInstruction    string  `json:"spoken_instruction,omitempty"`
	TargetDurationSec    *int    `json:"target_duration_sec,omitempty"`
	TargetDistanceKm     *float64 `json:"target_distance_km,omitempty"`
	TargetPaceMinPerKm   *float64 `json:"target_pace_min_per_km,omitempty"`
	TargetPaceMaxPerKm   *float64 `json:"target_pace_max_per_km,omitempty"`
	TargetHeartRateMin   *int    `json:"target_heart_rate_min,omitempty"`
	TargetHeartRateMax   *int    `json:"target_heart_rate_max,omitempty"`
	Repetitions          *int    `json:"repetitions,omitempty"`
	RecoverySec          *int    `json:"recovery_sec,omitempty"`
	CompletionCriteria   string  `json:"completion_criteria"` // time | distance | manual
}

// RunningWorkoutSegmentResponse represents a segment in API responses.
type RunningWorkoutSegmentResponse struct {
	ID                   string  `json:"id"`
	TemplateID           string  `json:"template_id"`
	OrderIndex           int     `json:"order_index"`
	Type                 string  `json:"type"`
	Instruction          string  `json:"instruction"`
	SpokenInstruction    string  `json:"spoken_instruction,omitempty"`
	TargetDurationSec    *int    `json:"target_duration_sec,omitempty"`
	TargetDistanceKm     *float64 `json:"target_distance_km,omitempty"`
	TargetPaceMinPerKm   *float64 `json:"target_pace_min_per_km,omitempty"`
	TargetPaceMaxPerKm   *float64 `json:"target_pace_max_per_km,omitempty"`
	TargetHeartRateMin   *int    `json:"target_heart_rate_min,omitempty"`
	TargetHeartRateMax   *int    `json:"target_heart_rate_max,omitempty"`
	Repetitions          *int    `json:"repetitions,omitempty"`
	RecoverySec          *int    `json:"recovery_sec,omitempty"`
	CompletionCriteria   string  `json:"completion_criteria"`
	CreatedAt            string  `json:"created_at"`
	UpdatedAt            string  `json:"updated_at"`
}

// RunningWorkoutTemplateResponse represents a template with its segments.
type RunningWorkoutTemplateResponse struct {
	ID                   string                             `json:"id"`
	CoachID              string                             `json:"coach_id"`
	Name                 string                             `json:"name"`
	Description          string                             `json:"description"`
	Type                 string                             `json:"type"`
	TargetPaceMinPerKm   *float64                           `json:"target_pace_min_per_km,omitempty"`
	TargetPaceMaxPerKm   *float64                           `json:"target_pace_max_per_km,omitempty"`
	TargetHeartRateMin   *int                               `json:"target_heart_rate_min,omitempty"`
	TargetHeartRateMax   *int                               `json:"target_heart_rate_max,omitempty"`
	TargetCadence        *int                               `json:"target_cadence,omitempty"`
	TargetDistanceKm     *float64                           `json:"target_distance_km,omitempty"`
	TargetDurationSec    *int                               `json:"target_duration_sec,omitempty"`
	Segments             []RunningWorkoutSegmentResponse    `json:"segments"`
	CreatedAt            string                             `json:"created_at"`
	UpdatedAt            string                             `json:"updated_at"`
}

// CreateRunningWorkoutAssignmentRequest is the payload for assigning a
// running workout to an athlete.
type CreateRunningWorkoutAssignmentRequest struct {
	TemplateID         string `json:"template_id"`
	AthleteID          string `json:"athlete_id"`
	ScheduledDate      string `json:"scheduled_date"` // RFC3339
	AthleteInstructions string `json:"athlete_instructions,omitempty"`
}

// RunningWorkoutAssignmentResponse represents an assignment in API responses.
type RunningWorkoutAssignmentResponse struct {
	ID                 string `json:"id"`
	TemplateID         string `json:"template_id"`
	AthleteID          string `json:"athlete_id"`
	CoachID            string `json:"coach_id"`
	ScheduledDate      string `json:"scheduled_date"`
	Status             string `json:"status"`
	AthleteInstructions string `json:"athlete_instructions"`
	CreatedAt          string `json:"created_at"`
	UpdatedAt          string `json:"updated_at"`
}

// StartRunningSessionRequest is the payload for starting an assigned running
// workout session.
type StartRunningSessionRequest struct {
	AssignmentID string `json:"assignment_id"`
}

// StartRunningSessionResponse is the response when starting a running session.
type StartRunningSessionResponse struct {
	SessionID  string `json:"session_id"`
	Status     string `json:"status"`
	Template   RunningWorkoutTemplateResponse `json:"template"`
}

// CompleteRunningSessionRequest is the payload for completing a running session.
type CompleteRunningSessionRequest struct {
	Distance    float64 `json:"distance"`
	Duration    int     `json:"duration"`
	Pace        string  `json:"pace"`
	Calories    int     `json:"calories"`
	Elevation   float64 `json:"elevation"`
	HeartRate   int     `json:"heart_rate"`
	Cadence     int     `json:"cadence"`
	GPSRoute    string  `json:"gps_route,omitempty"`
}

// CompleteRunningSessionResponse is the response when completing a running session.
type CompleteRunningSessionResponse struct {
	SessionID  string `json:"session_id"`
	Status     string `json:"status"`
	Distance   float64 `json:"distance"`
	Duration   int     `json:"duration"`
	Pace       string  `json:"pace"`
	Calories   int     `json:"calories"`
	HeartRate  int     `json:"heart_rate"`
	Cadence    int     `json:"cadence"`
}
