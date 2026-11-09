// Package coach_landing define el persistence port para landing pages de coach.
package coach_landing

import (
	"context"
)

// Repository define operaciones de persistencia para LandingPage.
type Repository interface {
	// Create inserta una nueva landing page.
	Create(ctx context.Context, lp *LandingPage) error
	// GetByID devuelve una landing por ID (solo si pertenece al coach).
	GetByID(ctx context.Context, id, coachID string) (*LandingPage, error)
	// GetBySlug devuelve una landing publicada por slug (público, sin auth).
	GetBySlug(ctx context.Context, slug string) (*LandingPage, error)
	// GetByCoach devuelve todas las landings de un coach.
	GetByCoach(ctx context.Context, coachID string) ([]*LandingPage, error)
	// Update actualiza una landing existente.
	Update(ctx context.Context, id, coachID string, in UpdateInput) error
	// Delete elimina una landing.
	Delete(ctx context.Context, id, coachID string) error
	// Publish publica o despublica una landing.
	Publish(ctx context.Context, id, coachID string, published bool) error
}
