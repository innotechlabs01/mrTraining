package analytics

import "context"

type Repository interface {
	GetDashboardSummary(ctx context.Context, coachID string) (*DashboardSummary, error)
	GetHRZones(ctx context.Context, athleteID string) ([]HRZone, error)
	GetFatigueMap(ctx context.Context, athleteID string) ([]FatigueMap, error)
	GetOneRM(ctx context.Context, athleteID string) ([]OneRM, error)
	GetTrainingSummary(ctx context.Context, coachID string) (*TrainingSummary, error)
	GetEffort(ctx context.Context, athleteID string) ([]Effort, error)
}
