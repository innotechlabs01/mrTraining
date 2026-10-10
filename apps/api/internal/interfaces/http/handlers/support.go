package handlers

import (
	supportapp "github.com/innotechlabs01/mr-training-api/internal/application/support"
	supportdomain "github.com/innotechlabs01/mr-training-api/internal/domain/support"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// SupportHandler handles support ticket HTTP requests.
type SupportHandler struct {
	service *supportapp.Service
}

// NewSupportHandler creates a new support handler.
func NewSupportHandler(service *supportapp.Service) *SupportHandler {
	return &SupportHandler{service: service}
}

// Coach endpoints
func (h *SupportHandler) ListTickets(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	status := c.Query("status")
	var s *supportdomain.TicketStatus
	if status != "" {
		sts := supportdomain.TicketStatus(status)
		s = &sts
	}
	tickets, err := h.service.ListTickets(c.Context(), coachID, s)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, dto.ListResponse[*dto.SupportTicketResponse]{
		Data:  toTicketResponses(tickets),
		Total: len(tickets),
		Page:  1,
		Limit: len(tickets),
	})
}

func (h *SupportHandler) GetTicket(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ticket ID is required")
	}
	ticket, err := h.service.GetTicket(c.Context(), coachID, id)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toTicketResponse(ticket))
}

func (h *SupportHandler) CreateTicket(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	var req dto.CreateTicketRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	ticket, err := h.service.CreateTicket(c.Context(), coachID, supportapp.CreateTicketRequest{
		Subject:  req.Subject,
		Body:     req.Body,
		Category: supportdomain.TicketCategory(req.Category),
		Priority: supportdomain.TicketPriority(req.Priority),
		AthleteID: req.AthleteID,
		ImageURL:  req.ImageURL,
	})
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toTicketResponse(ticket))
}

func (h *SupportHandler) UpdateTicket(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ticket ID is required")
	}
	var req dto.UpdateTicketRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	var status *supportdomain.TicketStatus
	if req.Status != nil {
		sts := supportdomain.TicketStatus(*req.Status)
		status = &sts
	}
	var priority *supportdomain.TicketPriority
	if req.Priority != nil {
		pr := supportdomain.TicketPriority(*req.Priority)
		priority = &pr
	}
	var category *supportdomain.TicketCategory
	if req.Category != nil {
		cat := supportdomain.TicketCategory(*req.Category)
		category = &cat
	}
	ticket, err := h.service.UpdateTicket(c.Context(), coachID, id, supportapp.UpdateTicketRequest{
		Status:    status,
		Priority:  priority,
		Category:  category,
		AssignedTo: req.AssignedTo,
	})
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toTicketResponse(ticket))
}

func (h *SupportHandler) DeleteTicket(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ticket ID is required")
	}
	if err := h.service.DeleteTicket(c.Context(), coachID, id); err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, fiber.Map{"deleted": true})
}

// Athlete endpoints
func (h *SupportHandler) ListAthleteTickets(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	status := c.Query("status")
	var s *supportdomain.TicketStatus
	if status != "" {
		sts := supportdomain.TicketStatus(status)
		s = &sts
	}
	tickets, err := h.service.ListAthleteTickets(c.Context(), athleteID, s)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, dto.ListResponse[*dto.SupportTicketResponse]{
		Data:  toTicketResponses(tickets),
		Total: len(tickets),
		Page:  1,
		Limit: len(tickets),
	})
}

func (h *SupportHandler) GetAthleteTicket(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ticket ID is required")
	}
	ticket, err := h.service.GetAthleteTicket(c.Context(), athleteID, id)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toTicketResponse(ticket))
}

func (h *SupportHandler) CreateAthleteTicket(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	var req dto.CreateTicketRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	ticket, err := h.service.CreateAthleteTicket(c.Context(), athleteID, supportapp.CreateAthleteTicketRequest{
		Subject:  req.Subject,
		Body:     req.Body,
		Category: supportdomain.TicketCategory(req.Category),
		Priority: supportdomain.TicketPriority(req.Priority),
		ImageURL:  req.ImageURL,
	})
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toTicketResponse(ticket))
}

// Messages (shared)
func (h *SupportHandler) ListMessages(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	ticketID := c.Params("ticketId")
	if ticketID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ticket ID is required")
	}
	messages, err := h.service.ListMessages(c.Context(), userID, userRole, ticketID)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toMessageResponses(messages))
}

func (h *SupportHandler) AddMessage(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	ticketID := c.Params("ticketId")
	if ticketID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ticket ID is required")
	}
	var req dto.AddSupportMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	msg, err := h.service.AddMessage(c.Context(), userID, userRole, ticketID, req.Body, req.ImageURL)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toMessageResponse(msg))
}

func (h *SupportHandler) MarkRead(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	ticketID := c.Params("ticketId")
	if ticketID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ticket ID is required")
	}
	if err := h.service.MarkRead(c.Context(), userID, userRole, ticketID); err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, fiber.Map{"marked_read": true})
}

func (h *SupportHandler) GetUnreadCount(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	ticketID := c.Params("ticketId")
	if ticketID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ticket ID is required")
	}
	count, err := h.service.GetUnreadCount(c.Context(), userID, userRole, ticketID)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, dto.UnreadCountResponse{Count: count})
}

func (h *SupportHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

func toTicketResponse(t *supportdomain.SupportTicket) *dto.SupportTicketResponse {
	return &dto.SupportTicketResponse{
		ID:            t.ID,
		TicketNumber:  t.TicketNumber,
		Subject:       t.Subject,
		Category:      string(t.Category),
		Priority:      string(t.Priority),
		Status:        string(t.Status),
		CoachID:       t.CoachID,
		AthleteID:     t.AthleteID,
		AssignedTo:    t.AssignedTo,
		UnreadCount:   t.UnreadCount,
		LastMessageAt: t.LastMessageAt,
		CreatedAt:     t.CreatedAt,
		UpdatedAt:     t.UpdatedAt,
		ResolvedAt:    t.ResolvedAt,
	}
}

func toTicketResponses(tickets []*supportdomain.SupportTicket) []*dto.SupportTicketResponse {
	responses := make([]*dto.SupportTicketResponse, 0, len(tickets))
	for _, t := range tickets {
		responses = append(responses, toTicketResponse(t))
	}
	return responses
}

func toMessageResponse(m *supportdomain.TicketMessage) *dto.TicketMessageResponse {
	return &dto.TicketMessageResponse{
		ID:        m.ID,
		TicketID:  m.TicketID,
		Author:    string(m.Author),
		AuthorID:  m.AuthorID,
		Body:      m.Body,
		ImageURL:  m.ImageURL,
		ReadAt:    m.ReadAt,
		CreatedAt: m.CreatedAt,
	}
}

func toMessageResponses(messages []*supportdomain.TicketMessage) []*dto.TicketMessageResponse {
	responses := make([]*dto.TicketMessageResponse, 0, len(messages))
	for _, m := range messages {
		responses = append(responses, toMessageResponse(m))
	}
	return responses
}