package handlers

import (
	"github.com/gofiber/fiber/v2"

	msgapp "github.com/innotechlabs01/mr-training-api/internal/application/message"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// MessageHandler handles HTTP requests for messaging.
type MessageHandler struct {
	service *msgapp.Service
}

func NewMessageHandler(service *msgapp.Service) *MessageHandler {
	return &MessageHandler{service: service}
}

// ListThreads handles GET /messages.
func (h *MessageHandler) ListThreads(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	threads, err := h.service.ListThreads(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}
	resp := make([]dto.MessageThreadResponse, len(threads))
	for i, t := range threads {
		resp[i] = dto.MessageThreadResponse{
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
	return appresponse.Success(c, resp)
}

// GetThread handles GET /messages/:id.
func (h *MessageHandler) GetThread(c *fiber.Ctx) error {
	threadID := c.Params("id")
	userID := middleware.GetUserID(c)
	thread, msgs, err := h.service.GetThreadWithMessages(c.Context(), threadID, userID)
	if err != nil {
		return h.handleError(c, err)
	}
	resp := dto.ThreadWithMessagesResponse{
		Thread: dto.MessageThreadResponse{
			ID:          thread.ID,
			CoachID:     thread.CoachID,
			AthleteID:   thread.AthleteID,
			AthleteName: thread.AthleteName,
			Subject:     thread.Subject,
			LastMessage: thread.LastMessage,
			LastSentAt:  thread.LastSentAt,
			UnreadCount: thread.UnreadCount,
			CreatedAt:   thread.CreatedAt,
			UpdatedAt:   thread.UpdatedAt,
		},
	}
	domainMsgs := msgs
	respMsgs := make([]dto.MessageResponse, len(domainMsgs))
	for i, m := range domainMsgs {
		respMsgs[i] = dto.MessageResponse{
			ID:         m.ID,
			ThreadID:   m.ThreadID,
			SenderID:   m.SenderID,
			SenderRole: m.SenderRole,
			Content:    m.Content,
			IsRead:     m.IsRead,
			CreatedAt:  m.CreatedAt,
		}
	}
	resp.Messages = respMsgs
	return appresponse.Success(c, resp)
}

// CreateThread handles POST /messages.
func (h *MessageHandler) CreateThread(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req dto.CreateThreadRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	thread, err := h.service.CreateThread(c.Context(), userID, req)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, dto.MessageThreadResponse{
		ID:          thread.ID,
		CoachID:     thread.CoachID,
		AthleteID:   thread.AthleteID,
		Subject:     thread.Subject,
		LastMessage: thread.LastMessage,
		LastSentAt:  thread.LastSentAt,
		UnreadCount: thread.UnreadCount,
		CreatedAt:   thread.CreatedAt,
		UpdatedAt:   thread.UpdatedAt,
	})
}

// AddMessage handles POST /messages/:id/messages.
func (h *MessageHandler) AddMessage(c *fiber.Ctx) error {
	var req dto.AddMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	// determine role from context? assume coach or athlete; we can infer from thread participants later.
	// For simplicity, assume coach sends messages (role coach) or athlete.
	msg, err := h.service.SendMessage(c.Context(), middleware.GetUserID(c), "coach", c.Params("id"), req.Content)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, dto.MessageResponse{
		ID:         msg.ID,
		ThreadID:   msg.ThreadID,
		SenderID:   msg.SenderID,
		SenderRole: msg.SenderRole,
		Content:    msg.Content,
		IsRead:     msg.IsRead,
		CreatedAt:  msg.CreatedAt,
	})
}

// MarkRead handles PATCH /messages/:id/read.
func (h *MessageHandler) MarkRead(c *fiber.Ctx) error {
	threadID := c.Params("id")
	userID := middleware.GetUserID(c)
	if err := h.service.MarkThreadRead(c.Context(), threadID, userID); err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, fiber.Map{"ok": true})
}

func (h *MessageHandler) handleError(c *fiber.Ctx, err error) error {
	// reuse generic error handling
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
}