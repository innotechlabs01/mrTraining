// Package coach defines the core coach domain entities for the MR Training API.
package coach

// CoachAthlete represents a coach's linked athlete profile.
type CoachAthlete struct {
	ID                string `json:"id"`
	CoachID           string `json:"coach_id"`
	Name              string `json:"name"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	Sport             string `json:"sport"`
	ServiceType       string `json:"service_type"`
	PlanName          string `json:"plan_name"`
	PlanPrice         int    `json:"plan_price"`
	PlanBilling       string `json:"plan_billing"`
	ScheduleDays      string `json:"schedule_days"`
	ScheduleTime      string `json:"schedule_time"`
	StartDate         string `json:"start_date"`
	EmergencyContact  string `json:"emergency_contact"`
	ReadinessScore    int    `json:"readiness_score"`
	FlagType          string `json:"flag_type"`
	FlagSeverity      string `json:"flag_severity"`
	FlagMessage       string `json:"flag_message"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
}
