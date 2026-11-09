// Package handlers ofrece handlers HTTP para testimonios de coaches.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	testimonialapp "github.com/innotechlabs01/mr-training-api/internal/application/testimonial"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/testimonial"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// TestimonialHandler maneja peticiones HTTP de testimonios.
type TestimonialHandler struct {
	svc *testimonialapp.Service
}

// NewTestimonialHandler crea un nuevo handler.
func NewTestimonialHandler(svc *testimonialapp.Service) *TestimonialHandler {
	return &TestimonialHandler{svc: svc}
}

// RegisterRoutes monta las rutas de testimonios en el grupo API.
func (h *TestimonialHandler) RegisterRoutes(api fiber.Router) {
	testimonials := api.Group("/testimonials")
	testimonials.Post("", h.Create)
	testimonials.Get("/:coachID", h.GetByCoach)
	testimonials.Put("/:id", h.Update)
	testimonials.Delete("/:id", h.Delete)
}

// RegisterPublicTestimonialRoutes monta rutas públicas de testimonios (sin auth).
func (h *TestimonialHandler) RegisterPublicTestimonialRoutes(app fiber.Router) {
	app.Get("/api/v1/coach/:coachID/testimonials", h.GetPublic)
	app.Get("/api/v1/testimonials", h.GetAllPublic)
}

// Create maneja POST /testimonials.
func (h *TestimonialHandler) Create(c *fiber.Ctx) error {
	coachID := c.Locals("coach_id").(string)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach context requerido")
	}

	var req struct {
		Name   string `json:"name"`
		Role   string `json:"role"`
		Text   string `json:"text"`
		Stars  int    `json:"stars"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "cuerpo inválido")
	}

	t, err := h.svc.Create(c.Context(), domain.CreateInput{
		CoachID: coachID,
		Name:    req.Name,
		Role:    req.Role,
		Text:    req.Text,
		Stars:   req.Stars,
	})
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			return appresponse.Error(c, appErr.Status, appErr.Message)
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, t)
}

// GetByCoach maneja GET /testimonials/:coachID.
func (h *TestimonialHandler) GetByCoach(c *fiber.Ctx) error {
	coachID := c.Params("coachID")
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach ID requerido")
	}

	ts, err := h.svc.GetByCoach(c.Context(), coachID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, ts)
}

// GetPublic maneja GET /api/v1/coach/:coachID/testimonials (público).
func (h *TestimonialHandler) GetPublic(c *fiber.Ctx) error {
	coachID := c.Params("coachID")
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach ID requerido")
	}

	ts, err := h.svc.GetPublic(c.Context(), coachID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, ts)
}

// GetAllPublic maneja GET /api/v1/testimonials (público, todos los publicados).
func (h *TestimonialHandler) GetAllPublic(c *fiber.Ctx) error {
	ts, err := h.svc.GetAllPublic(c.Context())
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, ts)
}

// Update maneja PUT /testimonials/:id.
func (h *TestimonialHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	coachID := c.Locals("coach_id").(string)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach context requerido")
	}

	var req struct {
		Name        string `json:"name,omitempty"`
		Role        string `json:"role,omitempty"`
		Text        string `json:"text,omitempty"`
		Stars       int    `json:"stars,omitempty"`
		IsPublished *bool  `json:"is_published,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "cuerpo inválido")
	}

	if err := h.svc.Update(c.Context(), id, coachID, domain.UpdateInput{
		Name:        req.Name,
		Role:        req.Role,
		Text:        req.Text,
		Stars:       req.Stars,
		IsPublished: req.IsPublished,
	}); err != nil {
		if err == domain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "testimonial no encontrado")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{"updated": true})
}

// Delete maneja DELETE /testimonials/:id.
func (h *TestimonialHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	coachID := c.Locals("coach_id").(string)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach context requerido")
	}

	if err := h.svc.Delete(c.Context(), id, coachID); err != nil {
		if err == domain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "testimonial no encontrado")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{"deleted": true})
}
