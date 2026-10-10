package handlers

import (
	planapp "github.com/innotechlabs01/mr-training-api/internal/application/plan"
	trmapp "github.com/innotechlabs01/mr-training-api/internal/application/trm"
	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// PlanHandler handles plan-related HTTP requests.
type PlanHandler struct {
	service *planapp.Service
	trm     *trmapp.Service
}

// NewPlanHandler creates a new plan handler.
func NewPlanHandler(service *planapp.Service, trmService *trmapp.Service) *PlanHandler {
	return &PlanHandler{service: service, trm: trmService}
}

// ListPlans returns the authenticated coach's plans (all, including drafts).
func (h *PlanHandler) ListPlans(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	plans, err := h.service.ListPlans(c.Context(), coachID, false)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, dto.ListResponse[*dto.PlanResponse]{
		Data:  toPlanResponses(plans),
		Total: len(plans),
		Page:  1,
		Limit: len(plans),
	})
}

// ListPublicPlans returns only active (published) plans for a coach.
func (h *PlanHandler) ListPublicPlans(c *fiber.Ctx) error {
	coachID := c.Params("coachId")
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach ID is required")
	}
	plans, err := h.service.ListPlans(c.Context(), coachID, true)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, dto.ListResponse[*dto.PlanResponse]{
		Data:  toPlanResponses(plans),
		Total: len(plans),
		Page:  1,
		Limit: len(plans),
	})
}

// CreatePlan creates a new plan for the authenticated coach.
func (h *PlanHandler) CreatePlan(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	var req dto.CreatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	plan, err := h.service.CreatePlan(c.Context(), coachID, req)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toPlanResponse(plan))
}

// UpdatePlan updates an existing plan.
func (h *PlanHandler) UpdatePlan(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "plan ID is required")
	}
	var req dto.UpdatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	plan, err := h.service.UpdatePlan(c.Context(), coachID, id, req)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toPlanResponse(plan))
}

// DeletePlan removes a plan.
func (h *PlanHandler) DeletePlan(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "plan ID is required")
	}
	if err := h.service.DeletePlan(c.Context(), coachID, id); err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, fiber.Map{"deleted": true})
}

// GetTRM returns the current Colombian exchange rate (TRM).
func (h *PlanHandler) GetTRM(c *fiber.Ctx) error {
	rate, err := h.trm.GetCurrent(c.Context())
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, dto.TRMResponse{
		Value:     rate.Value,
		VigenciaD: rate.VigenciaD,
	})
}

func (h *PlanHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

func toPlanResponse(p *plandomain.Plan) *dto.PlanResponse {
	resp := &dto.PlanResponse{
		ID:                 p.ID,
		Name:               p.Name,
		Description:        p.Description,
		Price:              p.Price,
		Currency:           p.Currency,
		BillingPeriod:      p.BillingPeriod,
		MaxAthletes:        p.MaxAthletes,
		MaxSessionsPerWeek: p.MaxSessionsPerWeek,
		IsActive:           p.IsActive,
		AthleteCount:       p.AthleteCount,
		CoachID:            p.CoachID,
		TRM:                p.TRM,
		CreatedAt:          p.CreatedAt,
		UpdatedAt:          p.UpdatedAt,
	}
	if p.DiscountType != "" && p.DiscountValue > 0 {
		resp.Discount = &dto.PlanDiscountDTO{
			Type:  p.DiscountType,
			Value: p.DiscountValue,
			Label: p.DiscountLabel,
			From:  p.DiscountValidFrom,
			Until: p.DiscountValidUntil,
			Code:  p.DiscountCode,
		}
	}
	return resp
}

func toPlanResponses(plans []*plandomain.Plan) []*dto.PlanResponse {
	responses := make([]*dto.PlanResponse, 0, len(plans))
	for _, p := range plans {
		responses = append(responses, toPlanResponse(p))
	}
	return responses
}
