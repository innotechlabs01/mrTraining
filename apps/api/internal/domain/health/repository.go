package health

import "context"

// Repository defines data access for health-related entities.
type Repository interface {
	GetMetrics(ctx context.Context, athleteID string, days int) ([]*HealthMetric, error)
	RecordMetric(ctx context.Context, m *HealthMetric) error
	GetSleepLogs(ctx context.Context, athleteID string, days int) ([]*SleepLog, error)
	RecordSleepLog(ctx context.Context, s *SleepLog) error
	GetDevices(ctx context.Context, athleteID string) ([]*HealthDevice, error)
	RegisterDevice(ctx context.Context, d *HealthDevice) error
	RemoveDevice(ctx context.Context, deviceID string) error
}
