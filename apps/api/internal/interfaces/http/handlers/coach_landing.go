// Package handlers ofrece handlers HTTP para landing pages de coach.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	coachlandingapp "github.com/innotechlabs01/mr-training-api/internal/application/coach_landing"
	coachlandingdomain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_landing"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CoachLandingHandler maneja peticiones HTTP de landing pages de coach.
type CoachLandingHandler struct {
	svc *coachlandingapp.Service
}

// NewCoachLandingHandler crea un nuevo handler.
func NewCoachLandingHandler(svc *coachlandingapp.Service) *CoachLandingHandler {
	return &CoachLandingHandler{svc: svc}
}

// RegisterRoutes monta las rutas de landing de coach en el grupo API.
func (h *CoachLandingHandler) RegisterRoutes(api fiber.Router) {
	landing := api.Group("/coach/landing")
	landing.Post("", h.Create)
	landing.Get("", h.GetByCoach)
	landing.Get("/:slug", h.GetBySlug) // público (fuera del grupo auth en main)
	landing.Put("/:id", h.Update)
	landing.Put("/:id/publish", h.Publish)
	landing.Delete("/:id", h.Delete)
}

// Create maneja POST /coach/landing.
func (h *CoachLandingHandler) Create(c *fiber.Ctx) error {
	coachID := c.Locals("coach_id").(string)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach context requerido")
	}

	var req struct {
		Slug      string `json:"slug"`
		Title     string `json:"title"`
		Subtitle  string `json:"subtitle"`
		Config    string `json:"config"`
		Sections  string `json:"sections"`
		Images    string `json:"images"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "cuerpo inválido")
	}

	lp, err := h.svc.Create(c.Context(), coachlandingdomain.CreateInput{
		CoachID:   coachID,
		Slug:      req.Slug,
		Title:     req.Title,
		Subtitle:  req.Subtitle,
		Config:    req.Config,
		Sections:  req.Sections,
		Images:    req.Images,
	})
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			return appresponse.Error(c, appErr.Status, appErr.Message)
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, lp)
}

// GetByCoach maneja GET /coach/landing (lista de landings del coach autenticado).
func (h *CoachLandingHandler) GetByCoach(c *fiber.Ctx) error {
	coachID := c.Locals("coach_id").(string)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach context requerido")
	}

	lps, err := h.svc.GetByCoach(c.Context(), coachID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, lps)
}

// GetCoachLanding maneja GET /coach/:slug (público, datos de landing del coach).
func (h *CoachLandingHandler) GetCoachLanding(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "slug requerido")
	}
	return h.GetBySlug(c)
}

// GetCoachPlans maneja GET /coach/:slug/plans (público, planes del coach).
func (h *CoachLandingHandler) GetCoachPlans(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "slug requerido")
	}
	lp, err := h.svc.GetBySlug(c.Context(), slug)
	if err != nil {
		if err == coachlandingdomain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "landing no encontrada")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	// Devolver los planes del coach desde su configuración de landing
	return appresponse.Success(c, fiber.Map{
		"coach_id": lp.CoachID,
		"plans":    lp.Config, // El config JSON contiene los planes del coach
	})
}

// GetBySlug maneja GET /l/:slug (público, sin auth).
func (h *CoachLandingHandler) GetBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "slug requerido")
	}

	lp, err := h.svc.GetBySlug(c.Context(), slug)
	if err != nil {
		if err == coachlandingdomain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "landing no encontrada")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, lp)
}

// Update maneja PUT /coach/landing/:id.
func (h *CoachLandingHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	coachID := c.Locals("coach_id").(string)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach context requerido")
	}

	var req struct {
		Title     string `json:"title,omitempty"`
		Subtitle  string `json:"subtitle,omitempty"`
		Config    string `json:"config,omitempty"`
		Sections  string `json:"sections,omitempty"`
		Images    string `json:"images,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "cuerpo inválido")
	}

	if err := h.svc.Update(c.Context(), id, coachID, coachlandingdomain.UpdateInput{
		Title:     req.Title,
		Subtitle:  req.Subtitle,
		Config:    req.Config,
		Sections:  req.Sections,
		Images:    req.Images,
	}); err != nil {
		if err == coachlandingdomain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "landing no encontrada")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{"updated": true})
}

// Publish maneja PUT /coach/landing/:id/publish.
func (h *CoachLandingHandler) Publish(c *fiber.Ctx) error {
	id := c.Params("id")
	coachID := c.Locals("coach_id").(string)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach context requerido")
	}

	var req struct {
		Published bool `json:"is_published"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "cuerpo inválido")
	}

	if err := h.svc.Publish(c.Context(), id, coachID, req.Published); err != nil {
		if err == coachlandingdomain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "landing no encontrada")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{"published": req.Published})
}

// Delete maneja DELETE /coach/landing/:id.
func (h *CoachLandingHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	coachID := c.Locals("coach_id").(string)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach context requerido")
	}

	if err := h.svc.Delete(c.Context(), id, coachID); err != nil {
		if err == coachlandingdomain.ErrNotFound {
			return appresponse.Error(c, fiber.StatusNotFound, "landing no encontrada")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{"deleted": true})
}
