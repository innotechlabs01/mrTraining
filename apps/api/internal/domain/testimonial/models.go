// Package testimonial define el dominio de testimonios de coaches.
package testimonial

import "errors"

// ErrNotFound se devuelve cuando no existe el testimonio.
var ErrNotFound = errors.New("testimonial not found")

// Testimonial es un testimonio de un atleta sobre un coach.
type Testimonial struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	Name        string `json:"name"`
	Role        string `json:"role"`
	Text        string `json:"text"`
	Stars       int    `json:"stars"`
	IsPublished bool   `json:"is_published"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// CreateInput es el payload para crear un testimonio.
type CreateInput struct {
	CoachID     string `json:"coach_id"`
	Name        string `json:"name"`
	Role        string `json:"role"`
	Text        string `json:"text"`
	Stars       int    `json:"stars"`
}

// Validate valida el input de creación.
func (i CreateInput) Validate() error {
	if i.CoachID == "" {
		return errors.New("coach_id es requerido")
	}
	if i.Name == "" {
		return errors.New("name es requerido")
	}
	if i.Role == "" {
		return errors.New("role es requerido")
	}
	if i.Text == "" {
		return errors.New("text es requerido")
	}
	if i.Stars < 1 || i.Stars > 5 {
		return errors.New("stars debe estar entre 1 y 5")
	}
	return nil
}
