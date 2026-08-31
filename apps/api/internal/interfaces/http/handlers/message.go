// Package handlers provides HTTP endpoint handlers for the message domain.
package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	messageapp "github.com/innotechlabs01/mr-training-api/internal/application/message"
	messagedomain "github.com/innotechlabs01/mr-training-api/internal/domain/message"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// MessageHandler handles HTTP requests for the message domain.
type MessageHandler struct {
	service *messageapp.Service
}

// NewMessageHandler creates a new MessageHandler with the given application service.
func NewMessageHandler(service *messageapp.Service) *MessageHandler {
	return &MessageHandler{service: service}
}

// ListThreads handles GET /messages.
// Returns all message threads for the authenticated user.
func (h *MessageHandler) ListThreads(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	threads, err := h.service.GetThreads(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.MessageThreadResponse, len(threads))
	for i, t := range threads {
		responses[i] = dto.MessageThreadResponse{
			ID:          t.ID,
			CoachID:     t.CoachID,
			AthleteID:   t.AthleteID,
			AthleteName: t.AthleteName,
			Subject:     t.Subject,
			LastMessage: t.LastMessage,
			LastSentAt:  t.LastSentAt,
			UnreadCount: t.UnreadCount,
			CreatedAt:   t.CreatedAt,
			UpdatedAt:   t.UpdatedAt,
		}
	}

	return appresponse.Success(c, responses)
}

// CreateThread handles POST /messages.
// Creates a new message thread.
func (h *MessageHandler) CreateThread(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateMessageThreadRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if strings.TrimSpace(req.AthleteID) == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete_id is required")
	}

	// Determine coach/athlete based on role
	userRole := middleware.GetUserRole(c)
	coachID := userID
	athleteID := req.AthleteID

	if userRole == "athlete" {
		// Athlete is creating the thread — body's athlete_id is actually the coach_id
		coachID = req.AthleteID
		athleteID = userID
	}

	thread := &messagedomain.MessageThread{
		CoachID:     coachID,
		AthleteID:   athleteID,
		AthleteName: req.AthleteName,
		Subject:     req.Subject,
	}

	if err := h.service.CreateThread(c.Context(), thread); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.MessageThreadResponse{
		ID:          thread.ID,
		CoachID:     thread.CoachID,
		AthleteID:   thread.AthleteID,
		AthleteName: thread.AthleteName,
		Subject:     thread.Subject,
		CreatedAt:   thread.CreatedAt,
		UpdatedAt:   thread.UpdatedAt,
	})
}

// SendMessage handles POST /messages/:threadId.
// Sends a message in a thread.
func (h *MessageHandler) SendMessage(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	threadID := c.Params("threadId")
	if threadID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "thread ID is required")
	}

	var req dto.SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if strings.TrimSpace(req.Content) == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "content is required")
	}

	userRole := middleware.GetUserRole(c)

	msg, err := h.service.SendMessage(c.Context(), threadID, userID, userRole, req.Content)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.ChatMessageResponse{
		ID:         msg.ID,
		ThreadID:   msg.ThreadID,
		SenderID:   msg.SenderID,
		SenderRole: msg.SenderRole,
		Content:    msg.Content,
		IsRead:     msg.IsRead,
		CreatedAt:  msg.CreatedAt,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *MessageHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
