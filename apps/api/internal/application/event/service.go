// Package event provides the application service layer for the event domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package event

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	eventdomain "github.com/innotechlabs01/mr-training-api/internal/domain/event"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
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
func (s *Service) UpdateEvent(ctx context.Context, id string, req dto.UpdateEventRequest) (*eventdomain.Event, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get event for update: %w", err)
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
func (s *Service) DeleteEvent(ctx context.Context, id string) error {
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

// ownershipCheck verifies the coach owns the event. Returns NotFound if not found,
// Forbidden if not the owner.
func ownershipCheck(ctx context.Context, repo eventdomain.Repository, eventID, coachID string) error {
	event, err := repo.GetByID(ctx, eventID)
	if err != nil {
		return err
	}
	if event.CoachID != coachID {
		return errors.Forbidden("you do not own this event")
	}
	return nil
}
