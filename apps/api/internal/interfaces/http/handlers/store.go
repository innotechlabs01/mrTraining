package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/application/store"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// StoreHandler handles HTTP requests for the athlete store.
type StoreHandler struct {
	service *store.Service
}

// NewStoreHandler creates a new StoreHandler.
func NewStoreHandler(service *store.Service) *StoreHandler {
	return &StoreHandler{service: service}
}

// ListStore handles GET /athlete/store.
func (h *StoreHandler) ListStore(c *fiber.Ctx) error {
	products, err := h.service.ListProducts(c.Context())
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, products)
}

// Purchase handles POST /athlete/store/purchase.
func (h *StoreHandler) Purchase(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	var req dto.PurchaseRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	purchase, err := h.service.PurchaseProduct(c.Context(), athleteID, req.ProductID, req.Quantity)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, purchase)
}

func (h *StoreHandler) handleError(c *fiber.Ctx, err error) error {
	// reuse generic error handling
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
}