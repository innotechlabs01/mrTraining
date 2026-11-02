// Package checkin provides the morning readiness check-in use cases.
package checkin

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/checkin"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service implements check-in operations.
type Service struct {
	repo domain.Repository
}

// NewService creates a check-in service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// Save validates and upserts the day's check-in.
func (s *Service) Save(ctx context.Context, c *domain.Checkin) (*domain.Checkin, error) {
	if c.AthleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if c.Readiness < 1 || c.Readiness > 5 {
		return nil, fmt.Errorf("readiness must be between 1 and 5")
	}
	if c.Soreness < 0 || c.Soreness > 5 {
		return nil, fmt.Errorf("soreness must be between 0 and 5")
	}
	if c.SleepHours < 0 || c.SleepHours > 24 {
		return nil, fmt.Errorf("sleep hours must be between 0 and 24")
	}
	if c.Date == "" {
		c.Date = time.Now().UTC().Format("2006-01-02")
	}
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	if err := s.repo.Upsert(ctx, c); err != nil {
		return nil, err
	}
	return s.repo.GetByDate(ctx, c.AthleteID, c.Date)
}

// GetToday returns today's check-in, or (nil, nil) when absent.
func (s *Service) GetToday(ctx context.Context, athleteID string) (*domain.Checkin, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	c, err := s.repo.GetByDate(ctx, athleteID, time.Now().UTC().Format("2006-01-02"))
	if err != nil {
		// Absence is a valid state: the athlete has not checked in yet.
		// Other failures (DB down) must surface instead of looking like absence.
		if appErr, ok := err.(*apperrors.AppError); ok && appErr.Status == 404 {
			return nil, nil
		}
		return nil, err
	}
	return c, nil
}

// ListRecent returns the latest check-ins (max 90).
func (s *Service) ListRecent(ctx context.Context, athleteID string, limit int) ([]*domain.Checkin, error) {
	if athleteID == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.ListRecent(ctx, athleteID, limit)
}
