// Package testimonial define el persistence port para testimonios.
package testimonial

import "context"

// Repository define operaciones de persistencia para Testimonial.
type Repository interface {
	// Create inserta un nuevo testimonio.
	Create(ctx context.Context, t *Testimonial) error
	// GetByID devuelve un testimonio por ID (solo si pertenece al coach).
	GetByID(ctx context.Context, id, coachID string) (*Testimonial, error)
	// GetByCoach devuelve todos los testimonios publicados de un coach.
	GetByCoach(ctx context.Context, coachID string) ([]*Testimonial, error)
	// GetPublic devuelve testimonios publicados de un coach (público).
	GetPublic(ctx context.Context, coachID string) ([]*Testimonial, error)
	// Update actualiza un testimonio existente.
	Update(ctx context.Context, id, coachID string, in UpdateInput) error
	// Delete elimina un testimonio.
	Delete(ctx context.Context, id, coachID string) error
	// PublicTestimonials devuelve testimonios publicados para landing.
	PublicTestimonials(ctx context.Context, coachID string) ([]*Testimonial, error)
	// GetAllPublic devuelve todos los testimonios publicados (landing principal).
	GetAllPublic(ctx context.Context) ([]*Testimonial, error)
}

// UpdateInput es el payload para actualizar un testimonio.
type UpdateInput struct {
	Name        string `json:"name,omitempty"`
	Role        string `json:"role,omitempty"`
	Text        string `json:"text,omitempty"`
	Stars       int    `json:"stars,omitempty"`
	IsPublished *bool  `json:"is_published,omitempty"`
}
