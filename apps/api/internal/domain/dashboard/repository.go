// internal/domain/dashboard/repository.go
package dashboard

import "context"

// Repository defines the data access interface for the dashboard.
type Repository interface {
	// GetSummary returns the aggregated summary for a coach.
	GetSummary(ctx context.Context, coachID string) (*DashboardSummary, error)
}