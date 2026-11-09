// Package testimonial es la capa de aplicación para testimonios.
package testimonial

import (
	"context"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/testimonial"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service orquesta casos de uso de testimonios.
type Service struct {
	repo domain.Repository
}

// NewService crea un nuevo servicio de testimonios.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// Create crea un nuevo testimonio.
func (s *Service) Create(ctx context.Context, in domain.CreateInput) (*domain.Testimonial, error) {
	if err := in.Validate(); err != nil {
		return nil, errors.BadRequest(err.Error())
	}

	t := &domain.Testimonial{
		CoachID:     in.CoachID,
		Name:        in.Name,
		Role:        in.Role,
		Text:        in.Text,
		Stars:       in.Stars,
		IsPublished: true,
	}

	if err := s.repo.Create(ctx, t); err != nil {
		return nil, fmt.Errorf("create testimonial: %w", err)
	}
	return t, nil
}

// GetByCoach devuelve todos los testimonios de un coach.
func (s *Service) GetByCoach(ctx context.Context, coachID string) ([]*domain.Testimonial, error) {
	return s.repo.GetByCoach(ctx, coachID)
}

// GetPublic devuelve testimonios publicados de un coach (público).
func (s *Service) GetPublic(ctx context.Context, coachID string) ([]*domain.Testimonial, error) {
	return s.repo.PublicTestimonials(ctx, coachID)
}

// GetAllPublic devuelve todos los testimonios publicados (para landing principal).
func (s *Service) GetAllPublic(ctx context.Context) ([]*domain.Testimonial, error) {
	return s.repo.GetAllPublic(ctx)
}

// Update actualiza un testimonio existente.
func (s *Service) Update(ctx context.Context, id, coachID string, in domain.UpdateInput) error {
	if _, err := s.repo.GetByID(ctx, id, coachID); err != nil {
		return err
	}
	return s.repo.Update(ctx, id, coachID, in)
}

// Delete elimina un testimonio.
func (s *Service) Delete(ctx context.Context, id, coachID string) error {
	if _, err := s.repo.GetByID(ctx, id, coachID); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id, coachID)
}
