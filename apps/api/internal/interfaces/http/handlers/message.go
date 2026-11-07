package handlers

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"

	msgapp "github.com/innotechlabs01/mr-training-api/internal/application/message"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// MessageHandler handles HTTP requests for messaging.
type MessageHandler struct {
	service *msgapp.Service
	db      *sql.DB
}

func NewMessageHandler(service *msgapp.Service, db *sql.DB) *MessageHandler {
	return &MessageHandler{service: service, db: db}
}

func (h *MessageHandler) withTx(c *fiber.Ctx, fn func(*msgapp.Service) error) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	coachID := middleware.GetCoachID(c)
	if h.db == nil || coachID == "" {
		return fn(h.service)
	}

	uow := database.NewUnitOfWork(h.db)
	if err := uow.Begin(c.Context(), userID, coachID, middleware.GetUserRole(c)); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to begin transaction")
	}
	defer uow.Rollback(c.Context())

	svc := h.service.SetExecutor(uow.Tx())

	if err := fn(svc); err != nil {
		return err
	}

	if err := uow.Commit(c.Context()); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to commit transaction")
	}
	return nil
}

// ListThreads handles GET /messages.
func (h *MessageHandler) ListThreads(c *fiber.Ctx) error {
	err := h.withTx(c, func(svc *msgapp.Service) error {
		userID := middleware.GetUserID(c)
		threads, err := svc.ListThreads(c.Context(), userID)
		if err != nil {
			return err
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
	})
	if err != nil {
		return h.handleError(c, err)
	}
	return nil
}

// GetThread handles GET /messages/:id.
func (h *MessageHandler) GetThread(c *fiber.Ctx) error {
	threadID := c.Params("id")
	userID := middleware.GetUserID(c)

	err := h.withTx(c, func(svc *msgapp.Service) error {
		thread, msgs, err := svc.GetThreadWithMessages(c.Context(), threadID, userID)
		if err != nil {
			return err
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
	})
	if err != nil {
		return h.handleError(c, err)
	}
	return nil
}

// CreateThread handles POST /messages.
func (h *MessageHandler) CreateThread(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req dto.CreateThreadRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	err := h.withTx(c, func(svc *msgapp.Service) error {
		thread, err := svc.CreateThread(c.Context(), userID, req)
		if err != nil {
			return err
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
	})
	if err != nil {
		return h.handleError(c, err)
	}
	return nil
}

// AddMessage handles POST /messages/:id/messages.
func (h *MessageHandler) AddMessage(c *fiber.Ctx) error {
	var req dto.AddMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	threadID := c.Params("id")
	userID := middleware.GetUserID(c)

	err := h.withTx(c, func(svc *msgapp.Service) error {
		msg, err := svc.SendMessage(c.Context(), userID, "coach", threadID, req.Content)
		if err != nil {
			return err
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
	})
	if err != nil {
		return h.handleError(c, err)
	}
	return nil
}

// MarkRead handles PATCH /messages/:id/read.
func (h *MessageHandler) MarkRead(c *fiber.Ctx) error {
	threadID := c.Params("id")
	userID := middleware.GetUserID(c)

	err := h.withTx(c, func(svc *msgapp.Service) error {
		if err := svc.MarkThreadRead(c.Context(), threadID, userID); err != nil {
			return err
		}
		return appresponse.Success(c, fiber.Map{"ok": true})
	})
	if err != nil {
		return h.handleError(c, err)
	}
	return nil
}

func (h *MessageHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
}
