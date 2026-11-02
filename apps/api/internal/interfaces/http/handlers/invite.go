package handlers

import (
	"github.com/gofiber/fiber/v2"

	inviteapp "github.com/innotechlabs01/mr-training-api/internal/application/invite"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// InviteHandler handles coach invitation HTTP requests.
type InviteHandler struct {
	service *inviteapp.Service
}

// NewInviteHandler creates a new InviteHandler.
func NewInviteHandler(service *inviteapp.Service) *InviteHandler {
	return &InviteHandler{service: service}
}

// AcceptInvite handles POST /invites/accept.
// Links the authenticated athlete to the coach referenced by the invite code.
func (h *InviteHandler) AcceptInvite(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.AcceptInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	result, err := h.service.AcceptInvite(c.Context(), req.Code, userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return appresponse.Success(c, result)
}

// ValidateInvite handles POST /invites/validate.
// Checks whether an invite code exists and is active without consuming it.
func (h *InviteHandler) ValidateInvite(c *fiber.Ctx) error {
	var req dto.ValidateInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	valid, err := h.service.ValidateCode(c.Context(), req.Code)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return appresponse.Success(c, dto.ValidateInviteResponse{Valid: valid, Code: req.Code})
}
