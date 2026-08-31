// Package today defines the Today dashboard domain entities.
package today

// TodayData aggregates today's view for an athlete.
type TodayData struct {
	Athlete        AthleteInfo     `json:"athlete"`
	Readiness      ReadinessScore  `json:"readiness"`
	TodaySessions  []Session       `json:"todaySessions"`
	ActiveWorkouts []ActiveWorkout `json:"activeWorkouts"`
}

// AthleteInfo is a minimal athlete identity for the today view.
type AthleteInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Sport string `json:"sport"`
}

// ReadinessScore holds readiness metrics.
type ReadinessScore struct {
	Score    int     `json:"score"`
	Sleep    float64 `json:"sleep"`
	HRV      float64 `json:"hrv"`
	Recovery float64 `json:"recovery"`
}

// Session is a scheduled session for today.
type Session struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Time     string `json:"time"`
	EndTime  string `json:"endTime"`
	Location string `json:"location"`
	Status   string `json:"status"`
}

// ActiveWorkout is an assigned workout in progress.
type ActiveWorkout struct {
	ID          string `json:"id"`
	ContentName string `json:"contentName"`
	Modality    string `json:"modality"`
	Status      string `json:"status"`
	Progress    int    `json:"progress"`
}
