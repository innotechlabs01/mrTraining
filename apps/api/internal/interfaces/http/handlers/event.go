// Package handlers provides HTTP endpoint handlers for the event domain.
package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

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

// ListEventRegistrations handles GET /events/:id/registrations.
// Returns all registrations for an event. Requires coach role and
// ownership of the event.
func (h *EventHandler) ListEventRegistrations(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	regs, err := h.service.ListRegistrationsByEvent(c.Context(), coachID, id)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.EventRegistrationResponse, len(regs))
	for i, r := range regs {
		responses[i] = dto.EventRegistrationResponse{
			ID:        r.ID,
			EventID:   r.EventID,
			AthleteID: r.AthleteID,
			Status:    r.Status,
			CreatedAt: r.CreatedAt,
			UpdatedAt: r.UpdatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.EventRegistrationResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// ListEventFormResponses handles GET /events/:id/form-responses.
// Returns all form responses for an event (coach view). Requires coach role
// and ownership of the event.
func (h *EventHandler) ListEventFormResponses(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	responses, err := h.service.ListFormResponsesByEvent(c.Context(), coachID, id)
	if err != nil {
		return h.handleError(c, err)
	}

	out := make([]dto.EventFormResponse, len(responses))
	for i, r := range responses {
		out[i] = dto.EventFormResponse{
			ID:        r.ID,
			EventID:   r.EventID,
			AthleteID: r.AthleteID,
			FieldID:   r.FieldID,
			Value:     r.Value,
			CreatedAt: r.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.EventFormResponse]{
		Data:  out,
		Total: len(out),
		Page:  1,
		Limit: len(out),
	})
}

// GetPublicEvent handles GET /api/v1/public/events/:id.
// Anonymous share-link access: only public events are returned and the
// coach ID is stripped from the payload.
func (h *EventHandler) GetPublicEvent(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	event, err := h.service.GetEvent(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}
	if !event.IsPublic {
		return errors.NotFound("Event", id)
	}

	resp := toEventResponse(event)
	resp.CoachID = ""
	return appresponse.Success(c, resp)
}

// RsvpEventPublic handles POST /api/v1/public/events/:id/rsvp.
// Anonymous attendees confirm or cancel attendance via the share link.
// The request is identified by a client-held token; when absent, one is
// generated and returned. Identity fields (name/email/phone) and custom
// form answers are stored as form responses.
func (h *EventHandler) RsvpEventPublic(c *fiber.Ctx) error {
	eventID := c.Params("id")
	if eventID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	var body struct {
		Token   string                 `json:"token"`
		Status  string                 `json:"status"`
		Name    string                 `json:"name"`
		Email   string                 `json:"email"`
		Phone   string                 `json:"phone"`
		Answers []eventapp.AnswerInput `json:"answers"`
	}
	if err := c.BodyParser(&body); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	token := strings.TrimSpace(body.Token)
	if token == "" {
		token = uuid.New().String()
	}

	answers := append([]eventapp.AnswerInput{}, body.Answers...)
	for _, a := range []struct{ id, value string }{
		{"name", body.Name},
		{"email", body.Email},
		{"phone", body.Phone},
	} {
		if strings.TrimSpace(a.value) != "" {
			answers = append(answers, eventapp.AnswerInput{FieldID: a.id, Value: a.value})
		}
	}

	reg, err := h.service.RsvpPublic(c.Context(), eventID, token, body.Status, answers)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"token": token, "status": reg.Status})
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

	middleware.InvalidateCache("events")
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

	event, err := h.service.UpdateEvent(c.Context(), coachID, id, req)
	if err != nil {
		return h.handleError(c, err)
	}

	middleware.InvalidateCache("events")
	return appresponse.Success(c, toEventResponse(event))
}

// DeleteEvent handles DELETE /events/:id.
// Deletes an event. Requires coach role.
func (h *EventHandler) DeleteEvent(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	if err := h.service.DeleteEvent(c.Context(), coachID, id); err != nil {
		return h.handleError(c, err)
	}

	middleware.InvalidateCache("events")
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

// GetAthleteEvent handles GET /athletes/events/:id.
// Returns the event detail the mobile screen needs: the event, its list/form
// data, running info, and the authenticated athlete's registration + responses.
func (h *EventHandler) GetAthleteEvent(c *fiber.Ctx) error {
	eventID := c.Params("id")
	athleteID := middleware.GetUserID(c)

	detail, err := h.service.GetAthleteEventDetail(c.Context(), eventID, athleteID)
	if err != nil {
		return h.handleError(c, err)
	}

	e := detail.Event
	resp := fiber.Map{
		"event": fiber.Map{
			"id":          e.ID,
			"title":       e.Title,
			"date":        e.Date,
			"time":        e.Time,
			"end_time":    e.EndTime,
			"type":        e.Type,
			"modality":    e.Modality,
			"location":    e.Location,
			"description": e.Description,
			"status":      e.Status,
		},
		"list_items": e.ListItems,
		"running":    nil,
	}

	if e.RunningDistanceKm != nil || e.RunningPace != "" || e.RunningMeetingPoint != "" {
		resp["running"] = fiber.Map{
			"distance_km":   e.RunningDistanceKm,
			"pace":          e.RunningPace,
			"meeting_point": e.RunningMeetingPoint,
		}
	}

	formFields := make([]fiber.Map, 0, len(e.FormFields))
	for _, f := range e.FormFields {
		formFields = append(formFields, fiber.Map{
			"id":       f.ID,
			"label":    f.Label,
			"kind":     f.Kind,
			"options":  f.Options,
			"required": f.Required,
		})
	}
	resp["form_fields"] = formFields

	if detail.Registration != nil {
		resp["registration"] = toRegistrationResponse(detail.Registration)
	}

	responses := make([]fiber.Map, 0, len(detail.Responses))
	for _, r := range detail.Responses {
		responses = append(responses, fiber.Map{
			"id":       r.ID,
			"field_id": r.FieldID,
			"value":    r.Value,
		})
	}
	resp["responses"] = responses

	return appresponse.Success(c, resp)
}

// RespondToEvent handles POST /athletes/events/:id/respond.
// Accepts {status, answers} and returns the resulting registration.
func (h *EventHandler) RespondToEvent(c *fiber.Ctx) error {
	eventID := c.Params("id")
	athleteID := middleware.GetUserID(c)

	var body struct {
		Status  string                 `json:"status"`
		Answers []eventapp.AnswerInput `json:"answers"`
	}
	if err := c.BodyParser(&body); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	reg, err := h.service.RespondToEvent(c.Context(), eventID, athleteID, body.Status, body.Answers)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"registration": toRegistrationResponse(reg)})
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
		RunningDistanceKm:   e.RunningDistanceKm,
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
