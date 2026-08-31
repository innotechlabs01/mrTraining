package dto

// TodayResponse represents the aggregated today data for an athlete.
type TodayResponse struct {
	Athlete        AthleteInfoResponse    `json:"athlete"`
	Readiness      ReadinessResponse      `json:"readiness"`
	TodaySessions  []SessionResponse      `json:"todaySessions"`
	ActiveWorkouts []AssignedWorkoutResponse `json:"activeWorkouts"`
}

// AthleteInfoResponse holds basic athlete identity for the today view.
type AthleteInfoResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Sport string `json:"sport"`
}

// ReadinessResponse holds the athlete's readiness metrics.
type ReadinessResponse struct {
	Score    int     `json:"score"`
	Sleep    float64 `json:"sleep"`
	HRV      float64 `json:"hrv"`
	Recovery float64 `json:"recovery"`
}

// SessionResponse represents a coach session in API responses.
type SessionResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Time     string `json:"time"`
	EndTime  string `json:"endTime"`
	Location string `json:"location"`
	Status   string `json:"status"`
}
