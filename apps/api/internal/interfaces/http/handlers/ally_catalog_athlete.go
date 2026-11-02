package handlers

import (
	"github.com/gofiber/fiber/v2"

	allycatalogapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_catalog"
	inviteapp "github.com/innotechlabs01/mr-training-api/internal/application/invite"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AllyCatalogAthleteHandler handles athlete-facing ally catalog endpoints.
// Athletes can browse products and services of the ally owned by their linked coach.
type AllyCatalogAthleteHandler struct {
	catalogService *allycatalogapp.Service
	inviteService  *inviteapp.Service
}

// NewAllyCatalogAthleteHandler creates a new AllyCatalogAthleteHandler.
func NewAllyCatalogAthleteHandler(catalogService *allycatalogapp.Service, inviteService *inviteapp.Service) *AllyCatalogAthleteHandler {
	return &AllyCatalogAthleteHandler{catalogService: catalogService, inviteService: inviteService}
}

// ListProductsForAthlete handles GET /athlete/ally/products.
// Returns all active products of the ally owned by the coach linked to the
// authenticated athlete.
func (h *AllyCatalogAthleteHandler) ListProductsForAthlete(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	coachID, err := h.inviteService.GetCoachIDByAthleteID(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, "no active coach link found for athlete")
	}

	products, err := h.catalogService.ListProductsByCoach(c.Context(), coachID, true)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AllyProductResponse, len(products))
	for i, p := range products {
		responses[i] = dto.AllyProductResponse{
			ID:          p.ID,
			AllyID:      p.AllyID,
			Name:        p.Name,
			Description: p.Description,
			ImageURL:    p.ImageURL,
			PriceCents:  p.PriceCents,
			Currency:    p.Currency,
			Stock:       p.Stock,
			Active:      p.Active,
			CreatedAt:   p.CreatedAt,
			UpdatedAt:   p.UpdatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.AllyProductResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

func (h *AllyCatalogAthleteHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// ListServicesForAthlete handles GET /athlete/ally/services.
// Returns all active services of the ally owned by the coach linked to the
// authenticated athlete.
func (h *AllyCatalogAthleteHandler) ListServicesForAthlete(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	coachID, err := h.inviteService.GetCoachIDByAthleteID(c.Context(), athleteID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, "no active coach link found for athlete")
	}

	services, err := h.catalogService.ListServicesByCoach(c.Context(), coachID, true)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AllyServiceResponse, len(services))
	for i, s := range services {
		responses[i] = dto.AllyServiceResponse{
			ID:          s.ID,
			AllyID:      s.AllyID,
			Name:        s.Name,
			Description: s.Description,
			ImageURL:    s.ImageURL,
			PriceCents:  s.PriceCents,
			Currency:    s.Currency,
			DurationMin: s.DurationMin,
			Capacity:    s.Capacity,
			Active:      s.Active,
			CreatedAt:   s.CreatedAt,
			UpdatedAt:   s.UpdatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.AllyServiceResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}
