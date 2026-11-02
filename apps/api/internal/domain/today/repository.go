package today

import "context"

// Repository defines data access for the Today dashboard.
type Repository interface {
	GetTodayData(ctx context.Context, athleteID string) (*TodayData, error)
}
