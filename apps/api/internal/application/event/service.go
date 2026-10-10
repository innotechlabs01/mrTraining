// Package event provides the application service layer for the event domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package event

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	eventdomain "github.com/innotechlabs01/mr-training-api/internal/domain/event"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// Service implements event-related business operations.
// It depends on the event.Repository interface, making it testable with mocks.
type Service struct {
	repo eventdomain.Repository
}

// NewService creates a new event application service with the given repository.
func NewService(repo eventdomain.Repository) *Service {
	return &Service{repo: repo}
}

// ListEvents returns all events for the given coach.
func (s *Service) ListEvents(ctx context.Context, coachID string) ([]*eventdomain.Event, error) {
	events, err := s.repo.ListByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	return events, nil
}

// GetEvent returns a single event by ID with its registrations and form data.
func (s *Service) GetEvent(ctx context.Context, id string) (*eventdomain.Event, error) {
	event, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get event: %w", err)
	}
	return event, nil
}

// ListRegistrationsByEvent returns all registrations for an event.
// Only the coach who owns the event may read them.
func (s *Service) ListRegistrationsByEvent(ctx context.Context, coachID, eventID string) ([]*eventdomain.EventRegistration, error) {
	if err := ownershipCheck(ctx, s.repo, eventID, coachID); err != nil {
		return nil, err
	}
	regs, err := s.repo.ListRegistrationsByEvent(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("list registrations by event: %w", err)
	}
	return regs, nil
}

// ListFormResponsesByEvent returns all form responses for an event.
// Only the coach who owns the event may read them.
func (s *Service) ListFormResponsesByEvent(ctx context.Context, coachID, eventID string) ([]eventdomain.EventFormResponse, error) {
	if err := ownershipCheck(ctx, s.repo, eventID, coachID); err != nil {
		return nil, err
	}
	responses, err := s.repo.ListFormResponsesByEvent(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("list form responses by event: %w", err)
	}
	return responses, nil
}

// CreateEvent creates a new event. Only coaches can create events.
func (s *Service) CreateEvent(ctx context.Context, coachID string, req dto.CreateEventRequest) (*eventdomain.Event, error) {
	event := &eventdomain.Event{
		ID:          uuid.New().String(),
		Title:       req.Title,
		Date:        req.Date,
		Time:        req.Time,
		EndTime:     req.EndTime,
		Type:        req.Type,
		Modality:    req.Modality,
		Location:    req.Location,
		Description: req.Description,
		Status:      req.Status,
		Format:      req.Format,
		IsPublic:    req.IsPublic,
		CoachID:     coachID,
		AthleteIDs:  req.AthleteIDs,
		ListItems:   req.ListItems,
		RunningDistanceKm:    req.RunningDistanceKm,
		RunningPace:          req.RunningPace,
		RunningMeetingPoint:  req.RunningMeetingPoint,
	}

	if event.Status == "" {
		event.Status = "scheduled"
	}
	if event.Type == "" {
		event.Type = "other"
	}
	if event.Modality == "" {
		event.Modality = "presencial"
	}

	if err := s.repo.Create(ctx, event); err != nil {
		return nil, fmt.Errorf("create event: %w", err)
	}

	// Set related data
	if len(req.AthleteIDs) > 0 {
		if err := s.repo.SetAthletes(ctx, event.ID, req.AthleteIDs); err != nil {
			return nil, fmt.Errorf("set event athletes: %w", err)
		}
	}

	if len(req.FormFields) > 0 {
		fields := make([]eventdomain.EventFormField, len(req.FormFields))
		for i, f := range req.FormFields {
			fields[i] = eventdomain.EventFormField{
				ID:        f.ID,
				EventID:   event.ID,
				Label:     f.Label,
				Kind:      f.Kind,
				Options:   f.Options,
				Required:  f.Required,
				SortOrder: f.SortOrder,
			}
		}
		if err := s.repo.SetFormFields(ctx, event.ID, fields); err != nil {
			return nil, fmt.Errorf("set event form fields: %w", err)
		}
	}

	if len(req.ListItems) > 0 {
		if err := s.repo.SetListItems(ctx, event.ID, req.ListItems); err != nil {
			return nil, fmt.Errorf("set event list items: %w", err)
		}
	}

	return event, nil
}

// UpdateEvent updates an existing event. Only the owning coach can update.
func (s *Service) UpdateEvent(ctx context.Context, coachID, id string, req dto.UpdateEventRequest) (*eventdomain.Event, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get event for update: %w", err)
	}
	if existing.CoachID != coachID {
		return nil, apperrors.Forbidden("you can only update your own events")
	}

	if req.Title != "" {
		existing.Title = req.Title
	}
	if req.Date != "" {
		existing.Date = req.Date
	}
	if req.Time != "" {
		existing.Time = req.Time
	}
	if req.EndTime != "" {
		existing.EndTime = req.EndTime
	}
	if req.Type != "" {
		existing.Type = req.Type
	}
	if req.Modality != "" {
		existing.Modality = req.Modality
	}
	if req.Location != "" {
		existing.Location = req.Location
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.Status != "" {
		existing.Status = req.Status
	}
	if req.Format != "" {
		existing.Format = req.Format
	}
	if req.RunningPace != "" {
		existing.RunningPace = req.RunningPace
	}
	if req.RunningMeetingPoint != "" {
		existing.RunningMeetingPoint = req.RunningMeetingPoint
	}
	if req.RunningDistanceKm != nil {
		existing.RunningDistanceKm = req.RunningDistanceKm
	}

	// Only update IsPublic if explicitly provided (always true/false, so check via pointer)
	existing.IsPublic = req.IsPublic

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("update event: %w", err)
	}

	// Update related data if provided
	if req.AthleteIDs != nil {
		if err := s.repo.SetAthletes(ctx, id, req.AthleteIDs); err != nil {
			return nil, fmt.Errorf("set event athletes: %w", err)
		}
		existing.AthleteIDs = req.AthleteIDs
	}

	if req.FormFields != nil {
		fields := make([]eventdomain.EventFormField, len(req.FormFields))
		for i, f := range req.FormFields {
			fields[i] = eventdomain.EventFormField{
				ID:        f.ID,
				EventID:   id,
				Label:     f.Label,
				Kind:      f.Kind,
				Options:   f.Options,
				Required:  f.Required,
				SortOrder: f.SortOrder,
			}
		}
		if err := s.repo.SetFormFields(ctx, id, fields); err != nil {
			return nil, fmt.Errorf("set event form fields: %w", err)
		}
		existing.FormFields = fields
	}

	if req.ListItems != nil {
		if err := s.repo.SetListItems(ctx, id, req.ListItems); err != nil {
			return nil, fmt.Errorf("set event list items: %w", err)
		}
		existing.ListItems = req.ListItems
	}

	return existing, nil
}

// DeleteEvent removes an event by ID.
func (s *Service) DeleteEvent(ctx context.Context, coachID, id string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get event for delete: %w", err)
	}
	if existing.CoachID != coachID {
		return apperrors.Forbidden("you can only delete your own events")
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete event: %w", err)
	}
	return nil
}

// RegisterForEvent registers an athlete for an event.
func (s *Service) RegisterForEvent(ctx context.Context, eventID, athleteID string) (*eventdomain.EventRegistration, error) {
	// Verify the event exists
	_, err := s.repo.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}

	reg := &eventdomain.EventRegistration{
		ID:        uuid.New().String(),
		EventID:   eventID,
		AthleteID: athleteID,
		Status:    "accepted",
	}

	if err := s.repo.UpsertRegistration(ctx, reg); err != nil {
		return nil, fmt.Errorf("register for event: %w", err)
	}

	return reg, nil
}

// CancelRegistration cancels an athlete's registration for an event.
func (s *Service) CancelRegistration(ctx context.Context, eventID, athleteID string) error {
	existing, err := s.repo.GetRegistration(ctx, eventID, athleteID)
	if err != nil {
		return err
	}

	existing.Status = "cancelled"
	if err := s.repo.UpsertRegistration(ctx, existing); err != nil {
		return fmt.Errorf("cancel registration: %w", err)
	}

	return nil
}

// GetMyRegistrations returns all events an athlete is registered for.
func (s *Service) GetMyRegistrations(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
	events, err := s.repo.ListRegistrationsByAthlete(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("get my registrations: %w", err)
	}
	return events, nil
}

// AthleteEventDetail bundles an event with the authenticated athlete's
// registration and form responses, used by the mobile event detail screen.
type AthleteEventDetail struct {
	Event        *eventdomain.Event
	Registration *eventdomain.EventRegistration // nil if not registered
	Responses    []eventdomain.EventFormResponse
}

// GetAthleteEventDetail returns an event plus the athlete's registration and responses.
// Returns NotFound if the event does not exist.
func (s *Service) GetAthleteEventDetail(ctx context.Context, eventID, athleteID string) (*AthleteEventDetail, error) {
	event, err := s.repo.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}

	registration, err := s.repo.GetRegistration(ctx, eventID, athleteID)
	if err != nil {
		var appErr *apperrors.AppError
		if !errors.As(err, &appErr) || appErr.Status != 404 {
			return nil, fmt.Errorf("get registration: %w", err)
		}
		registration = nil
	}

	responses, err := s.repo.GetFormResponses(ctx, eventID, athleteID)
	if err != nil {
		return nil, fmt.Errorf("get form responses: %w", err)
	}

	return &AthleteEventDetail{
		Event:        event,
		Registration: registration,
		Responses:    responses,
	}, nil
}

// AnswerInput is a single form response submitted by an athlete.
type AnswerInput struct {
	FieldID string `json:"field_id"`
	Value   string `json:"value"`
}

// RespondToEvent registers/cancels an athlete for an event and, on acceptance,
// saves the submitted form responses. Returns the resulting registration.
func (s *Service) RespondToEvent(ctx context.Context, eventID, athleteID, status string, answers []AnswerInput) (*eventdomain.EventRegistration, error) {
	if status != "accepted" && status != "cancelled" {
		return nil, apperrors.BadRequest("status must be 'accepted' or 'cancelled'")
	}

	if _, err := s.repo.GetByID(ctx, eventID); err != nil {
		return nil, err
	}

	reg := &eventdomain.EventRegistration{
		ID:        uuid.New().String(),
		EventID:   eventID,
		AthleteID: athleteID,
		Status:    status,
	}
	if err := s.repo.UpsertRegistration(ctx, reg); err != nil {
		return nil, fmt.Errorf("respond to event: %w", err)
	}

	if status == "accepted" {
		responses := make([]eventdomain.EventFormResponse, 0, len(answers))
		for _, a := range answers {
			if a.FieldID == "" {
				continue
			}
			responses = append(responses, eventdomain.EventFormResponse{
				EventID:   eventID,
				AthleteID: athleteID,
				FieldID:   a.FieldID,
				Value:     a.Value,
			})
		}
		if len(responses) > 0 {
			if err := s.repo.SaveFormResponses(ctx, eventID, athleteID, responses); err != nil {
				return nil, fmt.Errorf("save form responses: %w", err)
			}
		}
	}

	// Re-read so the returned registration has DB timestamps.
	if saved, err := s.repo.GetRegistration(ctx, eventID, athleteID); err == nil {
		return saved, nil
	}
	return reg, nil
}

// eventEnded reports whether the event's end moment is in the past.
func eventEnded(event *eventdomain.Event) bool {
	if event.Date == "" {
		return false
	}
	end := event.Date + "T23:59:59"
	if t := strings.TrimSpace(event.EndTime); t != "" {
		end = event.Date + "T" + t + ":00"
	}
	parsed, err := time.ParseInLocation("2006-01-02T15:04:05", end, time.Local)
	if err != nil {
		return false
	}
	return parsed.Before(time.Now())
}

// RsvpPublic accepts or cancels an anonymous RSVP from the public event link.
// The attendee is identified by a client-held token (stored as "anon:<token>").
// Only public, not-cancelled, not-ended events accept RSVPs.
func (s *Service) RsvpPublic(ctx context.Context, eventID, token, status string, answers []AnswerInput) (*eventdomain.EventRegistration, error) {
	if status != "accepted" && status != "cancelled" {
		return nil, apperrors.BadRequest("status must be 'accepted' or 'cancelled'")
	}
	if strings.TrimSpace(token) == "" {
		return nil, apperrors.BadRequest("token is required")
	}

	event, err := s.repo.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if !event.IsPublic {
		return nil, apperrors.Forbidden("event is not open for public registration")
	}
	if event.Status == "cancelled" {
		return nil, apperrors.Conflict("event was cancelled")
	}
	if eventEnded(event) {
		return nil, apperrors.Conflict("event has already ended")
	}

	athleteID := "anon:" + strings.TrimSpace(token)
	reg := &eventdomain.EventRegistration{
		ID:        uuid.New().String(),
		EventID:   eventID,
		AthleteID: athleteID,
		Status:    status,
	}
	if err := s.repo.UpsertRegistration(ctx, reg); err != nil {
		return nil, fmt.Errorf("public rsvp: %w", err)
	}

	if status == "accepted" {
		responses := make([]eventdomain.EventFormResponse, 0, len(answers))
		for _, a := range answers {
			if a.FieldID == "" {
				continue
			}
			responses = append(responses, eventdomain.EventFormResponse{
				EventID:   eventID,
				AthleteID: athleteID,
				FieldID:   a.FieldID,
				Value:     a.Value,
			})
		}
		if len(responses) > 0 {
			if err := s.repo.SaveFormResponses(ctx, eventID, athleteID, responses); err != nil {
				return nil, fmt.Errorf("save public rsvp responses: %w", err)
			}
		}
	}

	if saved, err := s.repo.GetRegistration(ctx, eventID, athleteID); err == nil {
		return saved, nil
	}
	return reg, nil
}

// ownershipCheck verifies the coach owns the event. Returns NotFound if not found,
// Forbidden if not the owner.
func ownershipCheck(ctx context.Context, repo eventdomain.Repository, eventID, coachID string) error {
	event, err := repo.GetByID(ctx, eventID)
	if err != nil {
		return err
	}
	if event.CoachID != coachID {
		return apperrors.Forbidden("you do not own this event")
	}
	return nil
}
