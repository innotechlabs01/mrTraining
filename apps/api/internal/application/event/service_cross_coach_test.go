package event

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	eventdomain "github.com/innotechlabs01/mr-training-api/internal/domain/event"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

type fakeEventRepoCross struct {
	event *eventdomain.Event
}

func (f fakeEventRepoCross) ListByCoach(ctx context.Context, coachID string) ([]*eventdomain.Event, error) {
	return nil, nil
}
func (f fakeEventRepoCross) ListByAthleteLinks(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
	return nil, nil
}
func (f fakeEventRepoCross) GetByID(ctx context.Context, id string) (*eventdomain.Event, error) {
	return f.event, nil
}
func (f fakeEventRepoCross) Create(ctx context.Context, event *eventdomain.Event) error { return nil }
func (f fakeEventRepoCross) Update(ctx context.Context, event *eventdomain.Event) error  { return nil }
func (f fakeEventRepoCross) Delete(ctx context.Context, id string) error                { return nil }
func (f fakeEventRepoCross) GetRegistration(ctx context.Context, eventID, athleteID string) (*eventdomain.EventRegistration, error) {
	return nil, nil
}
func (f fakeEventRepoCross) UpsertRegistration(ctx context.Context, reg *eventdomain.EventRegistration) error {
	return nil
}
func (f fakeEventRepoCross) ListRegistrationsByAthlete(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
	return nil, nil
}
func (f fakeEventRepoCross) ListRegistrationsByEvent(ctx context.Context, eventID string) ([]*eventdomain.EventRegistration, error) {
	return nil, nil
}
func (f fakeEventRepoCross) SetAthletes(ctx context.Context, eventID string, athleteIDs []string) error { return nil }
func (f fakeEventRepoCross) SetFormFields(ctx context.Context, eventID string, fields []eventdomain.EventFormField) error {
	return nil
}
func (f fakeEventRepoCross) SetListItems(ctx context.Context, eventID string, items []string) error { return nil }
func (f fakeEventRepoCross) GetFormResponses(ctx context.Context, eventID, athleteID string) ([]eventdomain.EventFormResponse, error) {
	return nil, nil
}
func (f fakeEventRepoCross) SaveFormResponses(ctx context.Context, eventID, athleteID string, responses []eventdomain.EventFormResponse) error {
	return nil
}
func (f fakeEventRepoCross) ListFormResponsesByEvent(ctx context.Context, eventID string) ([]eventdomain.EventFormResponse, error) {
	return nil, nil
}

func TestServiceEvents_UpdateCrossCoachDenied(t *testing.T) {
	repo := fakeEventRepoCross{event: &eventdomain.Event{ID: "event-1", CoachID: "coach-b"}}
	svc := NewService(repo)
	req := dto.UpdateEventRequest{}
	_, err := svc.UpdateEvent(context.Background(), "coach-a", "event-1", req)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "you can only update your own events")
}

func TestServiceEvents_DeleteCrossCoachDenied(t *testing.T) {
	repo := fakeEventRepoCross{event: &eventdomain.Event{ID: "event-1", CoachID: "coach-b"}}
	svc := NewService(repo)
	err := svc.DeleteEvent(context.Background(), "coach-a", "event-1")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "you can only delete your own events")
}