// Package handlers provides HTTP endpoint handlers for the ally purchase domain.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	allypurchaseapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_purchase"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AllyPurchaseHandler handles HTTP requests for ally product purchases.
type AllyPurchaseHandler struct {
	service *allypurchaseapp.Service
}

// NewAllyPurchaseHandler creates a new AllyPurchaseHandler.
func NewAllyPurchaseHandler(service *allypurchaseapp.Service) *AllyPurchaseHandler {
	return &AllyPurchaseHandler{service: service}
}

// CreateAllyPurchase handles POST /athlete/ally/products/:id/purchase.
// Allows an athlete to purchase an ally product, automatically creating the
// operation and accruing the commission for the coach.
func (h *AllyPurchaseHandler) CreateAllyPurchase(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	productID := c.Params("id")
	if productID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "product ID is required")
	}

	var req dto.CreateAllyPurchaseRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Quantity < 1 {
		req.Quantity = 1
	}

	result, err := h.service.CreateAllyPurchase(c.Context(), allypurchaseapp.CreateAllyPurchaseInput{
		ProductID:  productID,
		Quantity:   req.Quantity,
		AthleteID:  athleteID,
	})
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return appresponse.Success(c, dto.AllyPurchaseResponse{
		OperationID:       result.OperationID,
		OperationKind:     result.OperationKind,
		RelationshipID:    result.RelationshipID,
		AllyID:            result.AllyID,
		CommissionEntryID: result.CommissionEntryID,
		CommissionCents:   result.CommissionCents,
		TotalCents:        result.TotalCents,
		Currency:          result.Currency,
	})
}
