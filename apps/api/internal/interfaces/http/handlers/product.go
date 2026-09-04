// Package handlers provides HTTP endpoint handlers for the product domain.
package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	productapp "github.com/innotechlabs01/mr-training-api/internal/application/product"
	productdomain "github.com/innotechlabs01/mr-training-api/internal/domain/product"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// ProductHandler handles HTTP requests for the product domain.
type ProductHandler struct {
	service *productapp.Service
}

// NewProductHandler creates a new ProductHandler with the given application service.
func NewProductHandler(service *productapp.Service) *ProductHandler {
	return &ProductHandler{service: service}
}

// ListProducts handles GET /products.
// Returns all products for the authenticated coach.
func (h *ProductHandler) ListProducts(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	products, err := h.service.ListProducts(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.ProductResponse, len(products))
	for i, p := range products {
		responses[i] = *toProductResponse(p)
	}

	return appresponse.Success(c, dto.ListResponse[dto.ProductResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// GetProduct handles GET /products/:id.
// Returns product detail.
func (h *ProductHandler) GetProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "product ID is required")
	}

	product, err := h.service.GetProduct(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toProductResponse(product))
}

// CreateProduct handles POST /products.
// Creates a new product. Requires coach role.
func (h *ProductHandler) CreateProduct(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "name is required")
	}

	product, err := h.service.CreateProduct(c.Context(), coachID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	middleware.InvalidateCache("products")
	return appresponse.Success(c, toProductResponse(product))
}

// UpdateProduct handles PUT /products/:id.
// Updates an existing product. Requires coach role.
func (h *ProductHandler) UpdateProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "product ID is required")
	}

	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	product, err := h.service.UpdateProduct(c.Context(), id, req)
	if err != nil {
		return h.handleError(c, err)
	}

	middleware.InvalidateCache("products")
	return appresponse.Success(c, toProductResponse(product))
}

// DeleteProduct handles DELETE /products/:id.
// Deletes a product. Requires coach role.
func (h *ProductHandler) DeleteProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "product ID is required")
	}

	if err := h.service.DeleteProduct(c.Context(), id); err != nil {
		return h.handleError(c, err)
	}

	middleware.InvalidateCache("products")
	return appresponse.Success(c, fiber.Map{"message": "product deleted"})
}

// GetSales handles GET /coaches/sales.
// Returns all sales for the authenticated coach.
func (h *ProductHandler) GetSales(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sales, err := h.service.GetSales(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.SaleResponse, len(sales))
	for i, s := range sales {
		responses[i] = *toSaleResponse(s)
	}

	return appresponse.Success(c, dto.ListResponse[dto.SaleResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// RecordSale handles POST /coaches/sales.
// Records a new sale. Requires coach role.
func (h *ProductHandler) RecordSale(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.RecordSaleRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.ProductID == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "product_id is required")
	}
	if req.Quantity <= 0 {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "quantity must be greater than 0")
	}
	if req.Date == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "date is required")
	}

	sale, err := h.service.RecordSale(c.Context(), coachID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toSaleResponse(sale))
}

// handleError maps application errors to appropriate HTTP responses.
func (h *ProductHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}

	errMsg := err.Error()
	if strings.Contains(errMsg, "does not belong") {
		return appresponse.Error(c, fiber.StatusForbidden, errMsg)
	}

	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// toProductResponse converts a domain Product entity to a DTO response.
func toProductResponse(p *productdomain.Product) *dto.ProductResponse {
	return &dto.ProductResponse{
		ID:                p.ID,
		Name:              p.Name,
		Brand:             p.Brand,
		ImageURL:          p.ImageURL,
		Price:             p.Price,
		Received:          p.Received,
		Gross:             p.Gross,
		Stock:             p.Stock,
		LowStockThreshold: p.LowStockThreshold,
		CoachID:           p.CoachID,
		CreatedAt:         p.CreatedAt,
		UpdatedAt:         p.UpdatedAt,
	}
}

// toSaleResponse converts a domain Sale entity to a DTO response.
func toSaleResponse(s *productdomain.Sale) *dto.SaleResponse {
	return &dto.SaleResponse{
		ID:           s.ID,
		ProductID:    s.ProductID,
		ProductName:  s.ProductName,
		Brand:        s.Brand,
		Quantity:     s.Quantity,
		UnitPrice:    s.UnitPrice,
		UnitReceived: s.UnitReceived,
		Total:        s.Total,
		Date:         s.Date,
		CoachID:      s.CoachID,
		CreatedAt:    s.CreatedAt,
	}
}
