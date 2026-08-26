// Package handlers provides HTTP endpoint handlers for the event domain.
package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	eventapp "github.com/innotechlabs01/mr-training-api/internal/application/event"
	eventdomain "github.com/innotechlabs01/mr-training-api/internal/domain/event"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// EventHandler handles HTTP requests for the event domain.
type EventHandler struct {
	service *eventapp.Service
}

// NewEventHandler creates a new EventHandler with the given application service.
func NewEventHandler(service *eventapp.Service) *EventHandler {
	return &EventHandler{service: service}
}

// ListEvents handles GET /events.
// Returns all events for the authenticated coach.
func (h *EventHandler) ListEvents(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	events, err := h.service.ListEvents(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.EventResponse, len(events))
	for i, e := range events {
		responses[i] = *toEventResponse(e)
	}

	return appresponse.Success(c, dto.ListResponse[dto.EventResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// GetEvent handles GET /events/:id.
// Returns event detail with registrations and form data.
func (h *EventHandler) GetEvent(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	event, err := h.service.GetEvent(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toEventResponse(event))
}

// CreateEvent handles POST /events.
// Creates a new event. Requires coach role.
func (h *EventHandler) CreateEvent(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Title == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "title is required")
	}
	if req.Date == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "date is required")
	}

	event, err := h.service.CreateEvent(c.Context(), coachID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toEventResponse(event))
}

// UpdateEvent handles PUT /events/:id.
// Updates an existing event. Requires coach role.
func (h *EventHandler) UpdateEvent(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.UpdateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	event, err := h.service.UpdateEvent(c.Context(), id, req)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toEventResponse(event))
}

// DeleteEvent handles DELETE /events/:id.
// Deletes an event. Requires coach role.
func (h *EventHandler) DeleteEvent(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	if err := h.service.DeleteEvent(c.Context(), id); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "event deleted"})
}

// RegisterForEvent handles POST /events/:id/register.
// Registers the authenticated athlete for an event.
func (h *EventHandler) RegisterForEvent(c *fiber.Ctx) error {
	eventID := c.Params("id")
	if eventID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	reg, err := h.service.RegisterForEvent(c.Context(), eventID, athleteID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toRegistrationResponse(reg))
}

// CancelRegistration handles DELETE /events/:id/register.
// Cancels the authenticated athlete's registration for an event.
func (h *EventHandler) CancelRegistration(c *fiber.Ctx) error {
	eventID := c.Params("id")
	if eventID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	if err := h.service.CancelRegistration(c.Context(), eventID, athleteID); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "registration cancelled"})
}

// GetMyRegistrations handles GET /athletes/events.
// Returns all events the authenticated athlete is registered for.
func (h *EventHandler) GetMyRegistrations(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	events, err := h.service.GetMyRegistrations(c.Context(), athleteID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.EventResponse, len(events))
	for i, e := range events {
		responses[i] = *toEventResponse(e)
	}

	return appresponse.Success(c, dto.ListResponse[dto.EventResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// handleValidationError converts validation errors into a 422 response.
func (h *EventHandler) handleValidationError(c *fiber.Ctx, validationErrs []string) error {
	return appresponse.Error(c, fiber.StatusUnprocessableEntity, strings.Join(validationErrs, "; "))
}

// handleError maps application errors to appropriate HTTP responses.
func (h *EventHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// toEventResponse converts a domain Event entity to a DTO response.
func toEventResponse(e *eventdomain.Event) *dto.EventResponse {
	resp := &dto.EventResponse{
		ID:                  e.ID,
		Title:               e.Title,
		Date:                e.Date,
		Time:                e.Time,
		EndTime:             e.EndTime,
		Type:                e.Type,
		Modality:            e.Modality,
		Location:            e.Location,
		Description:         e.Description,
		Status:              e.Status,
		Format:              e.Format,
		IsPublic:            e.IsPublic,
		RunningDistanceKm:    e.RunningDistanceKm,
		RunningPace:         e.RunningPace,
		RunningMeetingPoint: e.RunningMeetingPoint,
		AthleteIDs:          e.AthleteIDs,
		CoachID:             e.CoachID,
		CreatedAt:           e.CreatedAt,
		UpdatedAt:           e.UpdatedAt,
	}

	if e.ListItems != nil {
		resp.ListItems = e.ListItems
	}

	if e.FormFields != nil {
		resp.FormFields = make([]dto.FormFieldResponse, len(e.FormFields))
		for i, f := range e.FormFields {
			resp.FormFields[i] = dto.FormFieldResponse{
				ID:        f.ID,
				Label:     f.Label,
				Kind:      f.Kind,
				Options:   f.Options,
				Required:  f.Required,
				SortOrder: f.SortOrder,
			}
		}
	}

	return resp
}

// toRegistrationResponse converts a domain EventRegistration to a DTO response.
func toRegistrationResponse(r *eventdomain.EventRegistration) *dto.EventRegistrationResponse {
	return &dto.EventRegistrationResponse{
		ID:        r.ID,
		EventID:   r.EventID,
		AthleteID: r.AthleteID,
		Status:    r.Status,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}
