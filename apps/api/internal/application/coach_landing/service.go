// Package coach_landing es la capa de aplicación para landing pages de coach.
// Orquesta negocio entre HTTP handlers y el repositorio.
package coach_landing

import (
	"context"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_landing"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service orquesta casos de uso de landing pages de coach.
type Service struct {
	repo domain.Repository
}

// NewService crea un nuevo servicio de landing pages de coach.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// Create crea una nueva landing page para un coach.
func (s *Service) Create(ctx context.Context, in domain.CreateInput) (*domain.LandingPage, error) {
	if err := in.Validate(); err != nil {
		return nil, errors.BadRequest(err.Error())
	}

	lp := &domain.LandingPage{
		CoachID:   in.CoachID,
		Slug:      in.Slug,
		Title:     in.Title,
		Subtitle:  in.Subtitle,
		Config:    in.Config,
		Sections:  in.Sections,
		Images:    in.Images,
		IsPublished: false,
	}

	if err := s.repo.Create(ctx, lp); err != nil {
		return nil, fmt.Errorf("create landing page: %w", err)
	}
	return lp, nil
}

// GetBySlug devuelve una landing publicada por slug (público).
func (s *Service) GetBySlug(ctx context.Context, slug string) (*domain.LandingPage, error) {
	return s.repo.GetBySlug(ctx, slug)
}

// GetByCoach devuelve todas las landings de un coach.
func (s *Service) GetByCoach(ctx context.Context, coachID string) ([]*domain.LandingPage, error) {
	return s.repo.GetByCoach(ctx, coachID)
}

// Update actualiza una landing existente.
func (s *Service) Update(ctx context.Context, id, coachID string, in domain.UpdateInput) error {
	if _, err := s.repo.GetByID(ctx, id, coachID); err != nil {
		return err
	}
	return s.repo.Update(ctx, id, coachID, in)
}

// Publish publica o despublica una landing.
func (s *Service) Publish(ctx context.Context, id, coachID string, published bool) error {
	if _, err := s.repo.GetByID(ctx, id, coachID); err != nil {
		return err
	}
	return s.repo.Publish(ctx, id, coachID, published)
}

// Delete elimina una landing.
func (s *Service) Delete(ctx context.Context, id, coachID string) error {
	if _, err := s.repo.GetByID(ctx, id, coachID); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id, coachID)
}
