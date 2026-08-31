// Package handlers provides HTTP endpoint handlers for the athlete store.
package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	storeapp "github.com/innotechlabs01/mr-training-api/internal/application/store"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// StoreHandler handles HTTP requests for the athlete store.
type StoreHandler struct {
	service *storeapp.Service
}

// NewStoreHandler creates a new StoreHandler.
func NewStoreHandler(service *storeapp.Service) *StoreHandler {
	return &StoreHandler{service: service}
}

// ListStore handles GET /athlete/store.
// Returns product list for athletes.
func (h *StoreHandler) ListStore(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	products, err := h.service.ListProducts(c.Context())
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.StoreProductResponse, len(products))
	for i, p := range products {
		responses[i] = dto.StoreProductResponse{
			ID:    p.ID,
			Name:  p.Name,
			Price: p.Price,
		}
	}
	if responses == nil {
		responses = []dto.StoreProductResponse{}
	}

	return appresponse.Success(c, dto.ListResponse[dto.StoreProductResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// Purchase handles POST /athlete/store/purchase.
func (h *StoreHandler) Purchase(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.PurchaseRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	// Support snake_case fallback if camelCase is empty
	if req.ProductID == "" {
		var raw map[string]interface{}
		_ = c.BodyParser(&raw)
		if v, ok := raw["product_id"].(string); ok {
			req.ProductID = v
		}
		if req.Quantity == 0 {
			if v, ok := raw["quantity"].(float64); ok {
				req.Quantity = int(v)
			}
		}
	}

	if strings.TrimSpace(req.ProductID) == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "productId is required")
	}
	if req.Quantity <= 0 {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "quantity must be greater than 0")
	}

	purchase, err := h.service.PurchaseProduct(c.Context(), userID, req.ProductID, req.Quantity)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.PurchaseResponse{
		ID:        purchase.ID,
		AthleteID: purchase.AthleteID,
		ProductID: purchase.ProductID,
		Quantity:  purchase.Quantity,
		Price:     purchase.Price,
		CreatedAt: purchase.CreatedAt,
	})
}

// handleError maps application errors to HTTP responses.
func (h *StoreHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	errMsg := err.Error()
	if strings.Contains(errMsg, "not found") {
		return appresponse.Error(c, fiber.StatusNotFound, errMsg)
	}
	if strings.Contains(errMsg, "required") || strings.Contains(errMsg, "must be greater") {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, errMsg)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
