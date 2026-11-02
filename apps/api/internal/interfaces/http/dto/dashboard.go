// internal/interfaces/http/dto/dashboard.go
package dto

// DashboardSummaryResponse – exactly the shape the web client expects
type DashboardSummaryResponse struct {
	TotalAthletes        int         `json:"total_athletes"`
	ActiveAthletes       int         `json:"active_athletes"`
	WorkoutsCompleted    int         `json:"workouts_completed"`
	WorkoutsPlanned      int         `json:"workouts_planned"`
	ComplianceRate       float64     `json:"compliance_rate"`
	AverageCompliance    float64     `json:"average_compliance"`
	RevenueCents         int64       `json:"revenue_cents"`
	UpcomingAppointments int         `json:"upcoming_appointments"`
	UpcomingEvents       int         `json:"upcoming_events"`
	RecentActivity       []ActivityItemResponse `json:"recent_activity"`
	GeneratedAt          string      `json:"generated_at"`
}

type ActivityItemResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	AthleteName string `json:"athlete_name,omitempty"`
	OccurredAt  string `json:"occurred_at"`
}