package handlers

import (
	"github.com/gofiber/fiber/v2"

	communityapp "github.com/innotechlabs01/mr-training-api/internal/application/community"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CommunityHandler handles HTTP requests for the community domain.
type CommunityHandler struct {
	service *communityapp.Service
}

// NewCommunityHandler creates a new CommunityHandler with the given application service.
func NewCommunityHandler(service *communityapp.Service) *CommunityHandler {
	return &CommunityHandler{service: service}
}

// GetCommunity handles GET /athlete/community.
func (h *CommunityHandler) GetCommunity(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	forums, challenges, err := h.service.GetCommunity(c.Context())
	if err != nil {
		return h.handleError(c, err)
	}

	forumResponses := make([]dto.ForumTopicResponse, len(forums))
	for i, f := range forums {
		forumResponses[i] = dto.ForumTopicResponse{
			ID:          f.ID,
			Title:       f.Title,
			Description: f.Description,
			Category:    f.Category,
		}
	}
	if forumResponses == nil {
		forumResponses = []dto.ForumTopicResponse{}
	}

	challengeResponses := make([]dto.ChallengeResponse, len(challenges))
	for i, ch := range challenges {
		challengeResponses[i] = dto.ChallengeResponse{
			ID:                ch.ID,
			Title:             ch.Title,
			Description:       ch.Description,
			DurationMinutes:   ch.DurationMinutes,
			Calories:          ch.Calories,
			ParticipantsCount: ch.ParticipantsCount,
		}
	}
	if challengeResponses == nil {
		challengeResponses = []dto.ChallengeResponse{}
	}

	return appresponse.Success(c, dto.CommunityResponse{
		Forums:     forumResponses,
		Challenges: challengeResponses,
	})
}

// ListMessages handles GET /athlete/community/messages.
func (h *CommunityHandler) ListMessages(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	forumID := c.Query("forumId", "default")
	if forumID == "" {
		forumID = "default"
	}

	messages, err := h.service.ListMessages(c.Context(), forumID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.MessageResponse, len(messages))
	for i, m := range messages {
		responses[i] = dto.MessageResponse{
			ID:        m.ID,
			UserID:    m.UserID,
			UserName:  m.UserName,
			Message:   m.Message,
			CreatedAt: m.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.MessageResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// CreateMessage handles POST /athlete/community/messages.
func (h *CommunityHandler) CreateMessage(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.ForumID == "" {
		req.ForumID = "default"
	}

	// Use userID as fallback for userName if not available via middleware.
	userName := userID

	msg, err := h.service.CreateMessage(c.Context(), req.ForumID, userID, userName, req.Message)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.MessageResponse{
		ID:        msg.ID,
		UserID:    msg.UserID,
		UserName:  msg.UserName,
		Message:   msg.Message,
		CreatedAt: msg.CreatedAt,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *CommunityHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
