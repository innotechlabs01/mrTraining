package handlers

import (
	"github.com/gofiber/fiber/v2"

	polarapp "github.com/innotechlabs01/mr-training-api/internal/application/polar"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// PolarHandler handles HTTP requests for the polar domain.
type PolarHandler struct {
	service *polarapp.Service
}

// NewPolarHandler creates a new PolarHandler with the given application service.
func NewPolarHandler(service *polarapp.Service) *PolarHandler {
	return &PolarHandler{service: service}
}

// CreateCheckout handles POST /polar/checkout.
func (h *PolarHandler) CreateCheckout(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreatePolarCheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.MembershipID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "membership_id is required")
	}

	checkout, err := h.service.CreateCheckout(c.Context(), userID, req.MembershipID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.PolarCheckoutResponse{
		ID:           checkout.ID,
		MembershipID: checkout.MembershipID,
		PolarOrderID: checkout.PolarOrderID,
		CheckoutURL:  checkout.CheckoutURL,
		Status:       checkout.Status,
		AmountCents:  checkout.AmountCents,
		Currency:     checkout.Currency,
		CreatedAt:    checkout.CreatedAt,
		CompletedAt:  checkout.CompletedAt,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *PolarHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}