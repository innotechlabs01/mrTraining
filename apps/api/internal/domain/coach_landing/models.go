// Package coach_landing define el dominio de landing pages públicas de coach.
// Cada coach puede crear su propia landing con slug único, servida sin redeploy.
package coach_landing

import (
	"errors"
)

// ErrNotFound se devuelve cuando no existe la landing solicitada.
var ErrNotFound = errors.New("coach landing page not found")

// LandingPage es el modelo de una landing pública de coach.
type LandingPage struct {
	ID          string `json:"id"`
	CoachID     string `json:"coach_id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Subtitle    string `json:"subtitle"`
	Config      string `json:"config"`   // JSON string: colores, fuentes, disposición
	Sections    string `json:"sections"` // JSON string: arreglo de secciones (drag-and-drop)
	Images      string `json:"images"`   // JSON string: URLs de imágenes subidas
	IsPublished bool   `json:"is_published"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// CreateInput es el payload para crear una landing.
type CreateInput struct {
	CoachID   string `json:"coach_id"`
	Slug      string `json:"slug"`
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle"`
	Config    string `json:"config"`
	Sections  string `json:"sections"`
	Images    string `json:"images"`
}

// UpdateInput es el payload para actualizar una landing.
type UpdateInput struct {
	Title       string `json:"title,omitempty"`
	Subtitle    string `json:"subtitle,omitempty"`
	Config      string `json:"config,omitempty"`
	Sections    string `json:"sections,omitempty"`
	Images      string `json:"images,omitempty"`
	IsPublished *bool  `json:"is_published,omitempty"`
}

// Validate valida el input de creación.
func (i CreateInput) Validate() error {
	if i.CoachID == "" {
		return errors.New("coach_id es requerido")
	}
	if i.Slug == "" {
		return errors.New("slug es requerido")
	}
	if i.Title == "" {
		return errors.New("title es requerido")
	}
	return nil
}
