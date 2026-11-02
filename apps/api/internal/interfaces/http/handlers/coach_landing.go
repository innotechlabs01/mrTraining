package handlers

import (
	"log"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v2"
	coachapp "github.com/innotechlabs01/mr-training-api/internal/application/coach"
	planapp "github.com/innotechlabs01/mr-training-api/internal/application/plan"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// CoachLandingHandler maneja la landing pública independiente por coach.
type CoachLandingHandler struct {
	coachService    *coachapp.Service
	planService     *planapp.Service
}

// NewCoachLandingHandler crea un nuevo CoachLandingHandler.
func NewCoachLandingHandler(coachService *coachapp.Service, planService *planapp.Service) *CoachLandingHandler {
	return &CoachLandingHandler{
		coachService:    coachService,
		planService:     planService,
	}
}

// GetCoachLanding muestra la landing pública del coach.
// GET /coach/{slug}
func (h *CoachLandingHandler) GetCoachLanding(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if strings.TrimSpace(slug) == "" {
		return c.Status(http.StatusBadRequest).JSON(dto.ErrorResponse{
			Error: dto.ErrorBody{
				Code:    "bad_request",
				Message: "slug es requerido",
			},
		})
	}

	// Obtener coach por slug a través del servicio
	coach, err := h.coachService.GetBySlug(c.Context(), slug)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return c.Status(http.StatusNotFound).JSON(dto.ErrorResponse{
				Error: dto.ErrorBody{
					Code:    "not_found",
					Message: "coach no encontrado",
				},
			})
		}
		log.Printf("Error al obtener coach por slug %s: %v", slug, err)
		return c.Status(http.StatusInternalServerError).JSON(dto.ErrorResponse{
			Error: dto.ErrorBody{
				Code:    "internal_error",
				Message: "error interno al consultar coach",
			},
		})
	}

	// Verificar que el coach esté activo
	if !coach.IsActive {
		return c.Status(http.StatusNotFound).JSON(dto.ErrorResponse{
			Error: dto.ErrorBody{
				Code:    "inactive",
				Message: "coach inactivo",
			},
		})
	}

	// Obtener planes activos del catálogo
	plans, err := h.planService.ListActivePlansByCoach(c.Context(), coach.ID)
	if err != nil {
		log.Printf("Error al listar planes del coach %s: %v", coach.ID, err)
		return c.Status(http.StatusInternalServerError).JSON(dto.ErrorResponse{
			Error: dto.ErrorBody{
				Code:    "internal_error",
				Message: "error interno al consultar planes",
			},
		})
	}

	// Construir respuesta adaptable a ambos modelos financieros
	planItems := make([]dto.PlanCatalogItem, 0, len(plans))
	for _, p := range plans {
		// Obtener versión activa para precio
		activeVersion, _ := h.planService.GetActiveVersionByPlan(c.Context(), p.ID)

		planItems = append(planItems, dto.PlanCatalogItem{
			ID:          p.ID,
			Name:        p.Name,
			Description: p.Description,
			Price:       float64(activeVersion.PriceCents),
			Currency:    activeVersion.Currency,
			Duration:    activeVersion.DurationUnit,
			Benefits:    activeVersion.Benefits,
			CTAText:     "Comprar ahora",
		})
	}

	return c.Status(http.StatusOK).JSON(dto.CoachLandingResponse{
		Slug:       slug,
		CoachName:  coach.Name,
		CoachPhoto: coach.PhotoURL,
		Biography:  coach.Biography,
		Specialities: coach.Specialities,
		Services:   coach.Services,
		PlanCatalog: planItems,
		CtaText:    "Comenzar práctica",
	})
}

// GetCoachPlans muestra los planes disponibles del coach.
// GET /coach/{slug}/plans
func (h *CoachLandingHandler) GetCoachPlans(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if strings.TrimSpace(slug) == "" {
		return c.Status(http.StatusBadRequest).JSON(dto.ErrorResponse{
			Error: dto.ErrorBody{
				Code:    "bad_request",
				Message: "slug es requerido",
			},
		})
	}

	// Obtener coach por slug a través del servicio
	coach, err := h.coachService.GetBySlug(c.Context(), slug)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return c.Status(http.StatusNotFound).JSON(dto.ErrorResponse{
				Error: dto.ErrorBody{
					Code:    "not_found",
					Message: "coach no encontrado",
				},
			})
		}
		log.Printf("Error al obtener coach por slug %s: %v", slug, err)
		return c.Status(http.StatusInternalServerError).JSON(dto.ErrorResponse{
			Error: dto.ErrorBody{
				Code:    "internal_error",
				Message: "error interno al consultar coach",
			},
		})
	}

	// Verificar que el coach esté activo
	if !coach.IsActive {
		return c.Status(http.StatusNotFound).JSON(dto.ErrorResponse{
			Error: dto.ErrorBody{
				Code:    "inactive",
				Message: "coach inactivo",
			},
		})
	}

	// Obtener planes activos del catálogo
	plans, err := h.planService.ListActivePlansByCoach(c.Context(), coach.ID)
	if err != nil {
		log.Printf("Error al listar planes del coach %s: %v", coach.ID, err)
		return c.Status(http.StatusInternalServerError).JSON(dto.ErrorResponse{
			Error: dto.ErrorBody{
				Code:    "internal_error",
				Message: "error interno al consultar planes",
			},
		})
	}

	// Construir respuesta
	planItems := make([]dto.PlanCatalogItem, 0, len(plans))
	for _, p := range plans {
		// Obtener versión activa para precio
		activeVersion, _ := h.planService.GetActiveVersionByPlan(c.Context(), p.ID)

		planItems = append(planItems, dto.PlanCatalogItem{
			ID:          p.ID,
			Name:        p.Name,
			Description: p.Description,
			Price:       float64(activeVersion.PriceCents),
			Currency:    activeVersion.Currency,
			Duration:    activeVersion.DurationUnit,
			Benefits:    activeVersion.Benefits,
			CTAText:     "Comprar ahora",
		})
	}

	return c.Status(http.StatusOK).JSON(dto.CoachPlansResponse{
		Slug: slug,
		Plans: planItems,
	})
}