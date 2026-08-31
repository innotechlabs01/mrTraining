package handlers

import (
	"github.com/gofiber/fiber/v2"

	favoriteapp "github.com/innotechlabs01/mr-training-api/internal/application/favorite"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// FavoriteHandler handles HTTP requests for the favorite domain.
type FavoriteHandler struct {
	service *favoriteapp.Service
}

// NewFavoriteHandler creates a new FavoriteHandler with the given application service.
func NewFavoriteHandler(service *favoriteapp.Service) *FavoriteHandler {
	return &FavoriteHandler{service: service}
}

// ListFavorites handles GET /favorites.
func (h *FavoriteHandler) ListFavorites(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	favorites, err := h.service.ListFavorites(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.FavoriteResponse, len(favorites))
	for i, f := range favorites {
		responses[i] = dto.FavoriteResponse{
			ID:         f.ID,
			ItemType:   f.ItemType,
			ItemID:     f.ItemID,
			ItemTitle:  f.ItemTitle,
			ItemMeta:   f.ItemMeta,
			CreatedAt:  f.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.FavoriteResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// CreateFavorite handles POST /favorites.
func (h *FavoriteHandler) CreateFavorite(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateFavoriteRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	favorite, err := h.service.CreateFavorite(c.Context(), userID, req.ItemType, req.ItemID, req.ItemTitle, req.ItemMeta)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.FavoriteResponse{
		ID:         favorite.ID,
		ItemType:   favorite.ItemType,
		ItemID:     favorite.ItemID,
		ItemTitle:  favorite.ItemTitle,
		ItemMeta:   favorite.ItemMeta,
		CreatedAt:  favorite.CreatedAt,
	})
}

// DeleteFavorite handles DELETE /favorites/:id.
func (h *FavoriteHandler) DeleteFavorite(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	favoriteID := c.Params("id")
	if favoriteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "favorite ID is required")
	}

	if err := h.service.DeleteFavorite(c.Context(), userID, favoriteID); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"ok": true})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *FavoriteHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}