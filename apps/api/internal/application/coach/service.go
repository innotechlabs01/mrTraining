// Package coach provides the application service layer for the coach domain.
package coach

import (
	"context"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/coach"
)

// Service implements coach-related business operations.
type Service struct {
	repo coach.Repository
}

// NewService creates a new coach application service.
func NewService(repo coach.Repository) *Service {
	return &Service{repo: repo}
}

// GetDashboard returns aggregated dashboard metrics for a coach.
func (s *Service) GetDashboard(ctx context.Context, coachID string) (*coach.Dashboard, error) {
	d, err := s.repo.GetDashboard(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("get dashboard: %w", err)
	}
	return d, nil
}

// GetDailySummary returns today's summary for a coach.
func (s *Service) GetDailySummary(ctx context.Context, coachID string) (*coach.DailySummary, error) {
	d, err := s.repo.GetDailySummary(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("get daily summary: %w", err)
	}
	return d, nil
}

// GetTimeBlocks returns all time blocks for a coach.
func (s *Service) GetTimeBlocks(ctx context.Context, coachID string) ([]*coach.TimeBlock, error) {
	blocks, err := s.repo.GetTimeBlocks(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("get time blocks: %w", err)
	}
	return blocks, nil
}

// SaveTimeBlocks replaces all time blocks for a coach.
func (s *Service) SaveTimeBlocks(ctx context.Context, coachID string, blocks []*coach.TimeBlock) error {
	for _, b := range blocks {
		if strings.TrimSpace(b.Title) == "" {
			return fmt.Errorf("block title is required")
		}
		if b.StartTime == "" || b.EndTime == "" {
			return fmt.Errorf("start_time and end_time are required")
		}
	}

	if err := s.repo.SaveTimeBlocks(ctx, coachID, blocks); err != nil {
		return fmt.Errorf("save time blocks: %w", err)
	}
	return nil
}

// GetAppointments returns all appointments for a coach.
func (s *Service) GetAppointments(ctx context.Context, coachID string) ([]*coach.Appointment, error) {
	apts, err := s.repo.GetAppointments(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("get appointments: %w", err)
	}
	return apts, nil
}

// CreateAppointment creates a new appointment.
func (s *Service) CreateAppointment(ctx context.Context, apt *coach.Appointment) error {
	if strings.TrimSpace(apt.AthleteID) == "" {
		return fmt.Errorf("athlete_id is required")
	}
	if strings.TrimSpace(apt.Title) == "" {
		return fmt.Errorf("title is required")
	}
	if apt.StartTime == "" || apt.EndTime == "" {
		return fmt.Errorf("start_time and end_time are required")
	}
	if apt.Status == "" {
		apt.Status = "scheduled"
	}

	if err := s.repo.CreateAppointment(ctx, apt); err != nil {
		return fmt.Errorf("create appointment: %w", err)
	}
	return nil
}

// UpdateAppointment updates an appointment's status.
func (s *Service) UpdateAppointment(ctx context.Context, id string, apt *coach.Appointment) error {
	if apt.Status == "" {
		return fmt.Errorf("status is required")
	}

	if err := s.repo.UpdateAppointment(ctx, id, apt); err != nil {
		return fmt.Errorf("update appointment: %w", err)
	}
	return nil
}

// GetAvailability returns availability slots for a coach.
func (s *Service) GetAvailability(ctx context.Context, coachID string) ([]*coach.CoachAvailability, error) {
	slots, err := s.repo.GetAvailability(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("get availability: %w", err)
	}
	return slots, nil
}

// SaveAvailability replaces all availability slots for a coach.
func (s *Service) SaveAvailability(ctx context.Context, coachID string, slots []*coach.CoachAvailability) error {
	for _, slot := range slots {
		if slot.StartTime == "" || slot.EndTime == "" {
			return fmt.Errorf("start_time and end_time are required for all slots")
		}
	}

	if err := s.repo.SaveAvailability(ctx, coachID, slots); err != nil {
		return fmt.Errorf("save availability: %w", err)
	}
	return nil
}
