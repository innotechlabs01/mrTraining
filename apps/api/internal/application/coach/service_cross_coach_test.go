package coach

import (
	"context"
	"fmt"
	"testing"

	coachdomain "github.com/innotechlabs01/mr-training-api/internal/domain/coach"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeCoachRepoCross struct {
	athlete *coachdomain.CoachAthlete
	err     error
}

func (f fakeCoachRepoCross) GetBySlug(ctx context.Context, slug string) (*coachdomain.Coach, error) { return nil, nil }
func (f fakeCoachRepoCross) GetDashboard(ctx context.Context, coachID string) (*coachdomain.Dashboard, error) {
	return nil, f.err
}
func (f fakeCoachRepoCross) GetDailySummary(ctx context.Context, coachID string) (*coachdomain.DailySummary, error) {
	return nil, f.err
}
func (f fakeCoachRepoCross) GetTimeBlocks(ctx context.Context, coachID string) ([]*coachdomain.TimeBlock, error) {
	return nil, nil
}
func (f fakeCoachRepoCross) SaveTimeBlocks(ctx context.Context, coachID string, blocks []*coachdomain.TimeBlock) error {
	return nil
}
func (f fakeCoachRepoCross) GetAppointments(ctx context.Context, coachID string) ([]*coachdomain.Appointment, error) {
	return nil, nil
}
func (f fakeCoachRepoCross) CreateAppointment(ctx context.Context, apt *coachdomain.Appointment) error { return nil }
func (f fakeCoachRepoCross) UpdateAppointment(ctx context.Context, id string, apt *coachdomain.Appointment) error {
	return nil
}
func (f fakeCoachRepoCross) GetAvailability(ctx context.Context, coachID string) ([]*coachdomain.CoachAvailability, error) {
	return nil, nil
}
func (f fakeCoachRepoCross) SaveAvailability(ctx context.Context, coachID string, slots []*coachdomain.CoachAvailability) error {
	return nil
}
func (f fakeCoachRepoCross) GetAthleteById(ctx context.Context, coachID string, athleteID string) (*coachdomain.CoachAthlete, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.athlete != nil && f.athlete.CoachID == coachID && f.athlete.ID == athleteID {
		return f.athlete, nil
	}
	return nil, nil
}
func (f fakeCoachRepoCross) SaveAthlete(ctx context.Context, coachID string, a *coachdomain.CoachAthlete) error {
	if f.athlete != nil && f.athlete.CoachID != coachID {
		return fmt.Errorf("forbidden")
	}
	return nil
}
func (f fakeCoachRepoCross) DeleteAthlete(ctx context.Context, coachID string, athleteID string) error {
	if f.athlete != nil && f.athlete.CoachID != coachID {
		return fmt.Errorf("forbidden")
	}
	return nil
}

func TestCoach_GetAthleteById_CrossCoachDenied(t *testing.T) {
	repo := fakeCoachRepoCross{athlete: &coachdomain.CoachAthlete{ID: "athlete-1", CoachID: "coach-b"}}
	svc := NewService(repo)
	got, err := svc.GetAthleteById(context.Background(), "coach-a", "athlete-1")
	require.NoError(t, err)
	assert.Nil(t, got)
}

func TestCoach_GetAthleteById_OwnAllowed(t *testing.T) {
	repo := fakeCoachRepoCross{athlete: &coachdomain.CoachAthlete{ID: "athlete-1", CoachID: "coach-a", Name: "Athlete"}}
	svc := NewService(repo)
	got, err := svc.GetAthleteById(context.Background(), "coach-a", "athlete-1")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "Athlete", got.Name)
}

func TestCoach_DeleteAthlete_CrossCoachDenied(t *testing.T) {
	repo := fakeCoachRepoCross{athlete: &coachdomain.CoachAthlete{ID: "athlete-1", CoachID: "coach-b"}}
	svc := NewService(repo)
	err := svc.DeleteAthlete(context.Background(), "coach-a", "athlete-1")
	require.Error(t, err)
}
