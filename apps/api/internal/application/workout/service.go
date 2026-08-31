package workout

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/workout"
)

// Service implements workout-related business operations.
type Service struct {
	repo workout.Repository
}

// NewService creates a new workout application service.
func NewService(repo workout.Repository) *Service {
	return &Service{repo: repo}
}

// ListByCoach returns all workout templates for a coach.
func (s *Service) ListByCoach(ctx context.Context, coachID string) ([]*workout.WorkoutTemplate, error) {
	if strings.TrimSpace(coachID) == "" {
		return nil, fmt.Errorf("coach_id is required")
	}
	templates, err := s.repo.ListByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}
	return templates, nil
}

// GetByID returns a single workout template by ID.
func (s *Service) GetByID(ctx context.Context, id string) (*workout.WorkoutTemplate, error) {
	if strings.TrimSpace(id) == "" {
		return nil, fmt.Errorf("id is required")
	}
	tmpl, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get template: %w", err)
	}
	return tmpl, nil
}

// CreateRequest holds parameters for creating a workout template.
type CreateRequest struct {
	CoachID string
	Name    string
	// Additional fields can be added as needed
}

// CreateTemplate creates a new workout template.
func (s *Service) CreateTemplate(ctx context.Context, req CreateRequest) (*workout.WorkoutTemplate, error) {
	if strings.TrimSpace(req.CoachID) == "" {
		return nil, fmt.Errorf("coach_id is required")
	}
	if strings.TrimSpace(req.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}
	tmpl := &workout.WorkoutTemplate{
		ID:      uuid.New().String(),
		CoachID: req.CoachID,
		Name:    strings.TrimSpace(req.Name),
	}
	if err := s.repo.Create(ctx, tmpl); err != nil {
		return nil, fmt.Errorf("create template: %w", err)
	}
	return tmpl, nil
}

// UpdateTemplate updates an existing workout template.
func (s *Service) UpdateTemplate(ctx context.Context, id string, tmpl *workout.WorkoutTemplate) error {
	if strings.TrimSpace(id) == "" {
		return fmt.Errorf("id is required")
	}
	tmpl.ID = id
	return s.repo.Update(ctx, tmpl)
}

// DeleteTemplate removes a workout template.
func (s *Service) DeleteTemplate(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return fmt.Errorf("id is required")
	}
	return s.repo.Delete(ctx, id)
}
