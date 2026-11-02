package routine

import (
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/routine"
)

// Service implements routine business operations.
type Service struct {
	repo domain.Repository
}

// NewService creates a new routine service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// ListRoutines returns all routines for an athlete.
func (s *Service) ListRoutines(athleteID string) ([]*domain.Routine, error) {
	return s.repo.ListByAthleteID(athleteID)
}

// GetRoutine returns a routine by ID.
func (s *Service) GetRoutine(id string) (*domain.Routine, error) {
	return s.repo.GetByID(id)
}

// CreateRoutine creates a new routine.
func (s *Service) CreateRoutine(rt *domain.Routine) error {
	return s.repo.Create(rt)
}

// UpdateRoutine updates an existing routine.
func (s *Service) UpdateRoutine(rt *domain.Routine) error {
	return s.repo.Update(rt)
}

// DeleteRoutine deletes a routine.
func (s *Service) DeleteRoutine(id, athleteID string) error {
	return s.repo.Delete(id, athleteID)
}
