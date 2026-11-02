// Package health provides application services for wearable health data.
package health

import (
	"context"
	"crypto/rand"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/health"
)

// Service handles health-related business logic.
type Service struct {
	repo health.Repository
}

// NewService creates a new health service.
func NewService(repo health.Repository) *Service {
	return &Service{repo: repo}
}

// GetMetrics returns recent health metrics for an athlete.
func (s *Service) GetMetrics(ctx context.Context, athleteID string, days int) ([]*health.HealthMetric, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if days <= 0 {
		days = 7
	}
	return s.repo.GetMetrics(ctx, athleteID, days)
}

// RecordMetric records a new health metric.
func (s *Service) RecordMetric(ctx context.Context, athleteID string, m *health.HealthMetric) error {
	if athleteID == "" {
		return fmt.Errorf("athlete ID is required")
	}
	if m.MetricType == "" {
		return fmt.Errorf("metric type is required")
	}
	if m.ID == "" {
		m.ID = generateID()
	}
	m.AthleteID = athleteID
	return s.repo.RecordMetric(ctx, m)
}

// GetSleepLogs returns recent sleep logs.
func (s *Service) GetSleepLogs(ctx context.Context, athleteID string, days int) ([]*health.SleepLog, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if days <= 0 {
		days = 7
	}
	return s.repo.GetSleepLogs(ctx, athleteID, days)
}

// RecordSleepLog records a sleep log.
func (s *Service) RecordSleepLog(ctx context.Context, athleteID string, s2 *health.SleepLog) error {
	if athleteID == "" {
		return fmt.Errorf("athlete ID is required")
	}
	if s2.Date == "" {
		return fmt.Errorf("date is required")
	}
	if s2.ID == "" {
		s2.ID = generateID()
	}
	s2.AthleteID = athleteID
	return s.repo.RecordSleepLog(ctx, s2)
}

// GetDevices returns registered devices.
func (s *Service) GetDevices(ctx context.Context, athleteID string) ([]*health.HealthDevice, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.GetDevices(ctx, athleteID)
}

// RegisterDevice registers a wearable device.
func (s *Service) RegisterDevice(ctx context.Context, athleteID string, d *health.HealthDevice) error {
	if athleteID == "" {
		return fmt.Errorf("athlete ID is required")
	}
	if d.Platform == "" {
		return fmt.Errorf("platform is required")
	}
	if d.ID == "" {
		d.ID = generateID()
	}
	d.AthleteID = athleteID
	return s.repo.RegisterDevice(ctx, d)
}

// RemoveDevice removes a device.
func (s *Service) RemoveDevice(ctx context.Context, deviceID string) error {
	if deviceID == "" {
		return fmt.Errorf("device ID is required")
	}
	return s.repo.RemoveDevice(ctx, deviceID)
}

func generateID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
