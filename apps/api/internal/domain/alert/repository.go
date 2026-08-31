package alert

import (
	"context"
)

// Repository defines the persistence interface for alerts.
type Repository interface {
	ListAlerts(ctx context.Context, athleteID string) ([]*Alert, error)
}