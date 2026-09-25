// internal/domain/dashboard/summary.go
package dashboard

import "time"

// DashboardSummary – aggregated KPIs for the coach dashboard
type DashboardSummary struct {
	TotalAthletes          int       `json:"total_athletes"`
	ActiveAthletes         int       `json:"active_athletes"`
	WorkoutsCompleted      int       `json:"workouts_completed"`
	WorkoutsPlanned        int       `json:"workouts_planned"`
	ComplianceRate         float64   `json:"compliance_rate"`        // 0-100
	AverageCompliance      float64   `json:"average_compliance"`     // 0-100
	RevenueCents           int64     `json:"revenue_cents"`          // cents
	UpcomingAppointments   int       `json:"upcoming_appointments"`
	UpcomingEvents         int       `json:"upcoming_events"`
	RecentActivity         []ActivityItem `json:"recent_activity"`
	GeneratedAt            time.Time `json:"generated_at"`
}

// ActivityItem – a single line in the “recent activity” feed
type ActivityItem struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`          // "workout_completed", "event_created", …
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	AthleteName string    `json:"athlete_name,omitempty"`
	OccurredAt  time.Time `json:"occurred_at"`
}