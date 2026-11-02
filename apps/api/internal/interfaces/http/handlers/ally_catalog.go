package handlers

import (
	"github.com/gofiber/fiber/v2"

	allycatalogapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_catalog"
	allycatalogdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_catalog"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AllyCatalogHandler handles HTTP requests for the ally catalog (products and
// services). All routes are scoped to the ally the authenticated user owns or
// belongs to (ownership resolved server-side; no client-side ally_id trusted).
type AllyCatalogHandler struct {
	service *allycatalogapp.Service
}

// NewAllyCatalogHandler creates a new AllyCatalogHandler.
func NewAllyCatalogHandler(service *allycatalogapp.Service) *AllyCatalogHandler {
	return &AllyCatalogHandler{service: service}
}

// ListProducts handles GET /ally/products.
func (h *AllyCatalogHandler) ListProducts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	activeOnly := c.Query("active_only") == "true"

	products, err := h.service.ListProducts(c.Context(), userID, activeOnly)
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

// CreateProduct handles POST /ally/products.
func (h *AllyCatalogHandler) CreateProduct(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateAllyProductRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	product, err := h.service.CreateProduct(c.Context(), userID, allycatalogdomain.CreateProductInput{
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		PriceCents:  req.PriceCents,
		Currency:    req.Currency,
		Stock:       req.Stock,
		Active:      req.Active,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyProductResponse{
		ID:          product.ID,
		AllyID:      product.AllyID,
		Name:        product.Name,
		Description: product.Description,
		ImageURL:    product.ImageURL,
		PriceCents:  product.PriceCents,
		Currency:    product.Currency,
		Stock:       product.Stock,
		Active:      product.Active,
		CreatedAt:   product.CreatedAt,
		UpdatedAt:   product.UpdatedAt,
	})
}

// UpdateProduct handles PUT /ally/products/:id.
func (h *AllyCatalogHandler) UpdateProduct(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	productID := c.Params("id")
	if productID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "product ID is required")
	}

	var req dto.UpdateAllyProductRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	product, err := h.service.UpdateProduct(c.Context(), userID, productID, allycatalogdomain.UpdateProductInput{
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		PriceCents:  req.PriceCents,
		Currency:    req.Currency,
		Stock:       req.Stock,
		Active:      req.Active,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyProductResponse{
		ID:          product.ID,
		AllyID:      product.AllyID,
		Name:        product.Name,
		Description: product.Description,
		ImageURL:    product.ImageURL,
		PriceCents:  product.PriceCents,
		Currency:    product.Currency,
		Stock:       product.Stock,
		Active:      product.Active,
		CreatedAt:   product.CreatedAt,
		UpdatedAt:   product.UpdatedAt,
	})
}

// ListServices handles GET /ally/services.
func (h *AllyCatalogHandler) ListServices(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	activeOnly := c.Query("active_only") == "true"

	services, err := h.service.ListServices(c.Context(), userID, activeOnly)
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

// CreateService handles POST /ally/services.
func (h *AllyCatalogHandler) CreateService(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateAllyServiceRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	service, err := h.service.CreateService(c.Context(), userID, allycatalogdomain.CreateServiceInput{
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		PriceCents:  req.PriceCents,
		Currency:    req.Currency,
		DurationMin: req.DurationMin,
		Capacity:    req.Capacity,
		Active:      req.Active,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyServiceResponse{
		ID:          service.ID,
		AllyID:      service.AllyID,
		Name:        service.Name,
		Description: service.Description,
		ImageURL:    service.ImageURL,
		PriceCents:  service.PriceCents,
		Currency:    service.Currency,
		DurationMin: service.DurationMin,
		Capacity:    service.Capacity,
		Active:      service.Active,
		CreatedAt:   service.CreatedAt,
		UpdatedAt:   service.UpdatedAt,
	})
}

// UpdateService handles PUT /ally/services/:id.
func (h *AllyCatalogHandler) UpdateService(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	serviceID := c.Params("id")
	if serviceID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "service ID is required")
	}

	var req dto.UpdateAllyServiceRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	service, err := h.service.UpdateService(c.Context(), userID, serviceID, allycatalogdomain.UpdateServiceInput{
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		PriceCents:  req.PriceCents,
		Currency:    req.Currency,
		DurationMin: req.DurationMin,
		Capacity:    req.Capacity,
		Active:      req.Active,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyServiceResponse{
		ID:          service.ID,
		AllyID:      service.AllyID,
		Name:        service.Name,
		Description: service.Description,
		ImageURL:    service.ImageURL,
		PriceCents:  service.PriceCents,
		Currency:    service.Currency,
		DurationMin: service.DurationMin,
		Capacity:    service.Capacity,
		Active:      service.Active,
		CreatedAt:   service.CreatedAt,
		UpdatedAt:   service.UpdatedAt,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *AllyCatalogHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
