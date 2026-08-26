package event

import (
	"context"
	"testing"

	eventdomain "github.com/innotechlabs01/mr-training-api/internal/domain/event"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// mockRepository implements event.Repository for testing.
type mockRepository struct {
	listByCoachFn               func(ctx context.Context, coachID string) ([]*eventdomain.Event, error)
	getByIDFn                   func(ctx context.Context, id string) (*eventdomain.Event, error)
	createFn                    func(ctx context.Context, event *eventdomain.Event) error
	updateFn                    func(ctx context.Context, event *eventdomain.Event) error
	deleteFn                    func(ctx context.Context, id string) error
	getRegistrationFn           func(ctx context.Context, eventID, athleteID string) (*eventdomain.EventRegistration, error)
	upsertRegistrationFn        func(ctx context.Context, reg *eventdomain.EventRegistration) error
	listRegistrationsByAthleteFn func(ctx context.Context, athleteID string) ([]*eventdomain.Event, error)
	setAthletesFn               func(ctx context.Context, eventID string, athleteIDs []string) error
	setFormFieldsFn             func(ctx context.Context, eventID string, fields []eventdomain.EventFormField) error
	setListItemsFn              func(ctx context.Context, eventID string, items []string) error
}

func (m *mockRepository) ListByCoach(ctx context.Context, coachID string) ([]*eventdomain.Event, error) {
	return m.listByCoachFn(ctx, coachID)
}

func (m *mockRepository) GetByID(ctx context.Context, id string) (*eventdomain.Event, error) {
	return m.getByIDFn(ctx, id)
}

func (m *mockRepository) Create(ctx context.Context, event *eventdomain.Event) error {
	return m.createFn(ctx, event)
}

func (m *mockRepository) Update(ctx context.Context, event *eventdomain.Event) error {
	return m.updateFn(ctx, event)
}

func (m *mockRepository) Delete(ctx context.Context, id string) error {
	return m.deleteFn(ctx, id)
}

func (m *mockRepository) GetRegistration(ctx context.Context, eventID, athleteID string) (*eventdomain.EventRegistration, error) {
	return m.getRegistrationFn(ctx, eventID, athleteID)
}

func (m *mockRepository) UpsertRegistration(ctx context.Context, reg *eventdomain.EventRegistration) error {
	return m.upsertRegistrationFn(ctx, reg)
}

func (m *mockRepository) ListRegistrationsByAthlete(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
	return m.listRegistrationsByAthleteFn(ctx, athleteID)
}

func (m *mockRepository) SetAthletes(ctx context.Context, eventID string, athleteIDs []string) error {
	return m.setAthletesFn(ctx, eventID, athleteIDs)
}

func (m *mockRepository) SetFormFields(ctx context.Context, eventID string, fields []eventdomain.EventFormField) error {
	return m.setFormFieldsFn(ctx, eventID, fields)
}

func (m *mockRepository) SetListItems(ctx context.Context, eventID string, items []string) error {
	return m.setListItemsFn(ctx, eventID, items)
}

func TestListEvents_Success(t *testing.T) {
	mock := &mockRepository{
		listByCoachFn: func(ctx context.Context, coachID string) ([]*eventdomain.Event, error) {
			return []*eventdomain.Event{
				{ID: "evt-1", Title: "Morning Run", CoachID: coachID, Date: "2025-01-15"},
				{ID: "evt-2", Title: "HIIT Session", CoachID: coachID, Date: "2025-01-20"},
			}, nil
		},
	}

	svc := NewService(mock)
	events, err := svc.ListEvents(context.Background(), "coach-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	if events[0].Title != "Morning Run" {
		t.Errorf("expected title 'Morning Run', got '%s'", events[0].Title)
	}
}

func TestListEvents_Empty(t *testing.T) {
	mock := &mockRepository{
		listByCoachFn: func(ctx context.Context, coachID string) ([]*eventdomain.Event, error) {
			return []*eventdomain.Event{}, nil
		},
	}

	svc := NewService(mock)
	events, err := svc.ListEvents(context.Background(), "coach-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 0 {
		t.Errorf("expected 0 events, got %d", len(events))
	}
}

func TestGetEvent_Success(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*eventdomain.Event, error) {
			return &eventdomain.Event{ID: id, Title: "Competition", CoachID: "coach-1"}, nil
		},
	}

	svc := NewService(mock)
	event, err := svc.GetEvent(context.Background(), "evt-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if event.Title != "Competition" {
		t.Errorf("expected title 'Competition', got '%s'", event.Title)
	}
}

func TestGetEvent_NotFound(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*eventdomain.Event, error) {
			return nil, errors.NotFound("Event", id)
		},
	}

	svc := NewService(mock)
	_, err := svc.GetEvent(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent event")
	}
}

func TestCreateEvent_Success(t *testing.T) {
	var createdEvent *eventdomain.Event
	mock := &mockRepository{
		createFn: func(ctx context.Context, event *eventdomain.Event) error {
			createdEvent = event
			return nil
		},
		setAthletesFn: func(ctx context.Context, eventID string, athleteIDs []string) error {
			return nil
		},
		setFormFieldsFn: func(ctx context.Context, eventID string, fields []eventdomain.EventFormField) error {
			return nil
		},
		setListItemsFn: func(ctx context.Context, eventID string, items []string) error {
			return nil
		},
	}

	svc := NewService(mock)
	event, err := svc.CreateEvent(context.Background(), "coach-1", dto.CreateEventRequest{
		Title:    "New Event",
		Date:     "2025-03-01",
		Time:     "09:00",
		EndTime:  "11:00",
		Type:     "session",
		Modality: "presencial",
		AthleteIDs: []string{"ath-1", "ath-2"},
		FormFields: []dto.CreateFormFieldRequest{
			{Label: "Experience", Kind: "select", Options: []string{"beginner", "advanced"}},
		},
		ListItems: []string{"Water", "Towel"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if createdEvent == nil {
		t.Fatal("expected event to be created")
	}
	if createdEvent.Title != "New Event" {
		t.Errorf("expected title 'New Event', got '%s'", createdEvent.Title)
	}
	if createdEvent.CoachID != "coach-1" {
		t.Errorf("expected coach_id 'coach-1', got '%s'", createdEvent.CoachID)
	}
	if event.Status != "scheduled" {
		t.Errorf("expected default status 'scheduled', got '%s'", event.Status)
	}
}

func TestCreateEvent_DefaultValues(t *testing.T) {
	mock := &mockRepository{
		createFn: func(ctx context.Context, event *eventdomain.Event) error { return nil },
		setAthletesFn: func(ctx context.Context, eventID string, athleteIDs []string) error { return nil },
		setFormFieldsFn: func(ctx context.Context, eventID string, fields []eventdomain.EventFormField) error { return nil },
		setListItemsFn: func(ctx context.Context, eventID string, items []string) error { return nil },
	}

	svc := NewService(mock)
	event, err := svc.CreateEvent(context.Background(), "coach-1", dto.CreateEventRequest{
		Title: "Minimal Event",
		Date:  "2025-03-01",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if event.Type != "other" {
		t.Errorf("expected default type 'other', got '%s'", event.Type)
	}
	if event.Modality != "presencial" {
		t.Errorf("expected default modality 'presencial', got '%s'", event.Modality)
	}
}

func TestUpdateEvent_Success(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*eventdomain.Event, error) {
			return &eventdomain.Event{ID: id, Title: "Old Title", Date: "2025-01-01", CoachID: "coach-1"}, nil
		},
		updateFn: func(ctx context.Context, event *eventdomain.Event) error { return nil },
		setAthletesFn: func(ctx context.Context, eventID string, athleteIDs []string) error { return nil },
		setFormFieldsFn: func(ctx context.Context, eventID string, fields []eventdomain.EventFormField) error { return nil },
		setListItemsFn: func(ctx context.Context, eventID string, items []string) error { return nil },
	}

	svc := NewService(mock)
	event, err := svc.UpdateEvent(context.Background(), "evt-1", dto.UpdateEventRequest{
		Title: "Updated Title",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if event.Title != "Updated Title" {
		t.Errorf("expected title 'Updated Title', got '%s'", event.Title)
	}
	if event.Date != "2025-01-01" {
		t.Errorf("expected date preserved '2025-01-01', got '%s'", event.Date)
	}
}

func TestDeleteEvent_Success(t *testing.T) {
	mock := &mockRepository{
		deleteFn: func(ctx context.Context, id string) error { return nil },
	}

	svc := NewService(mock)
	err := svc.DeleteEvent(context.Background(), "evt-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDeleteEvent_NotFound(t *testing.T) {
	mock := &mockRepository{
		deleteFn: func(ctx context.Context, id string) error {
			return errors.NotFound("Event", id)
		},
	}

	svc := NewService(mock)
	err := svc.DeleteEvent(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent event")
	}
}

func TestRegisterForEvent_Success(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*eventdomain.Event, error) {
			return &eventdomain.Event{ID: id, Title: "Open Run"}, nil
		},
		upsertRegistrationFn: func(ctx context.Context, reg *eventdomain.EventRegistration) error {
			return nil
		},
	}

	svc := NewService(mock)
	reg, err := svc.RegisterForEvent(context.Background(), "evt-1", "ath-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if reg.EventID != "evt-1" {
		t.Errorf("expected event_id 'evt-1', got '%s'", reg.EventID)
	}
	if reg.AthleteID != "ath-1" {
		t.Errorf("expected athlete_id 'ath-1', got '%s'", reg.AthleteID)
	}
	if reg.Status != "accepted" {
		t.Errorf("expected status 'accepted', got '%s'", reg.Status)
	}
}

func TestRegisterForEvent_EventNotFound(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*eventdomain.Event, error) {
			return nil, errors.NotFound("Event", id)
		},
	}

	svc := NewService(mock)
	_, err := svc.RegisterForEvent(context.Background(), "nonexistent", "ath-1")
	if err == nil {
		t.Fatal("expected error for nonexistent event")
	}
}

func TestCancelRegistration_Success(t *testing.T) {
	mock := &mockRepository{
		getRegistrationFn: func(ctx context.Context, eventID, athleteID string) (*eventdomain.EventRegistration, error) {
			return &eventdomain.EventRegistration{
				ID:        "reg-1",
				EventID:   eventID,
				AthleteID: athleteID,
				Status:    "accepted",
			}, nil
		},
		upsertRegistrationFn: func(ctx context.Context, reg *eventdomain.EventRegistration) error {
			if reg.Status != "cancelled" {
				t.Errorf("expected status 'cancelled', got '%s'", reg.Status)
			}
			return nil
		},
	}

	svc := NewService(mock)
	err := svc.CancelRegistration(context.Background(), "evt-1", "ath-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCancelRegistration_NotFound(t *testing.T) {
	mock := &mockRepository{
		getRegistrationFn: func(ctx context.Context, eventID, athleteID string) (*eventdomain.EventRegistration, error) {
			return nil, errors.NotFound("Registration", eventID+"/"+athleteID)
		},
	}

	svc := NewService(mock)
	err := svc.CancelRegistration(context.Background(), "evt-1", "ath-1")
	if err == nil {
		t.Fatal("expected error for nonexistent registration")
	}
}

func TestGetMyRegistrations_Success(t *testing.T) {
	mock := &mockRepository{
		listRegistrationsByAthleteFn: func(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
			return []*eventdomain.Event{
				{ID: "evt-1", Title: "Registered Event"},
			}, nil
		},
	}

	svc := NewService(mock)
	events, err := svc.GetMyRegistrations(context.Background(), "ath-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Title != "Registered Event" {
		t.Errorf("expected title 'Registered Event', got '%s'", events[0].Title)
	}
}

func TestGetMyRegistrations_Empty(t *testing.T) {
	mock := &mockRepository{
		listRegistrationsByAthleteFn: func(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
			return []*eventdomain.Event{}, nil
		},
	}

	svc := NewService(mock)
	events, err := svc.GetMyRegistrations(context.Background(), "ath-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 0 {
		t.Errorf("expected 0 events, got %d", len(events))
	}
}
