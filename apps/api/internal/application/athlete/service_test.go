package athlete

import (
	"context"
	"errors"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/domain/athlete"
	appErrors "github.com/innotechlabs01/mr-training-api/internal/errors"
)

// mockRepository is a test double for athlete.Repository.
type mockRepository struct {
	workouts []*athlete.WorkoutSummary
	metrics  []*athlete.MetricPoint
	messages []*athlete.MessageThread
	err      error
}

func (m *mockRepository) GetByID(context.Context, string) (*athlete.Athlete, error) {
	return nil, m.err
}
func (m *mockRepository) GetWorkouts(context.Context, string) ([]*athlete.WorkoutSummary, error) {
	return m.workouts, m.err
}
func (m *mockRepository) GetMetrics(context.Context, string) ([]*athlete.MetricPoint, error) {
	return m.metrics, m.err
}
func (m *mockRepository) GetMessages(context.Context, string) ([]*athlete.MessageThread, error) {
	return m.messages, m.err
}

func TestServiceListWorkouts(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepository{
		workouts: []*athlete.WorkoutSummary{
			{ID: "w-1", Name: "Tempo Run", SportType: "running", ScheduledDate: "2026-01-15", Status: "scheduled"},
		},
	}
	svc := NewService(repo)

	got, err := svc.ListWorkouts(ctx, "ath-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != "w-1" {
		t.Fatalf("unexpected workouts: %+v", got)
	}
}

func TestServiceListWorkoutsEmpty(t *testing.T) {
	svc := NewService(&mockRepository{})
	got, err := svc.ListWorkouts(context.Background(), "ath-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got == nil {
		t.Fatal("expected empty slice, got nil")
	}
	if len(got) != 0 {
		t.Fatalf("expected 0 workouts, got %d", len(got))
	}
}

func TestServiceListWorkoutsRepoError(t *testing.T) {
	svc := NewService(&mockRepository{err: errors.New("db down")})
	_, err := svc.ListWorkouts(context.Background(), "ath-1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceListWorkoutsEmptyID(t *testing.T) {
	svc := NewService(&mockRepository{})
	_, err := svc.ListWorkouts(context.Background(), "")
	if err == nil {
		t.Fatal("expected error for empty athleteID, got nil")
	}
	var appErr *appErrors.AppError
	if !errors.As(err, &appErr) || appErr.Status != 400 {
		t.Fatalf("expected 400 BadRequest, got %v", err)
	}
}

func TestServiceGetMetrics(t *testing.T) {
	repo := &mockRepository{
		metrics: []*athlete.MetricPoint{{MetricDate: "2026-01-01", WeightKg: 72.5, RestingHR: 55}},
	}
	svc := NewService(repo)
	got, err := svc.GetMetrics(context.Background(), "ath-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].WeightKg != 72.5 {
		t.Fatalf("unexpected metrics: %+v", got)
	}
}

func TestServiceListMessages(t *testing.T) {
	repo := &mockRepository{
		messages: []*athlete.MessageThread{{ID: "t-1", CoachID: "coach-1", Subject: "Hi", UnreadCount: 2}},
	}
	svc := NewService(repo)
	got, err := svc.ListMessages(context.Background(), "ath-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != "t-1" {
		t.Fatalf("unexpected messages: %+v", got)
	}
}

func TestServiceEmptyIDRejected(t *testing.T) {
	svc := NewService(&mockRepository{})
	for _, fn := range []struct {
		name string
		call func() error
	}{
		{"ListWorkouts", func() error { _, err := svc.ListWorkouts(context.Background(), ""); return err }},
		{"GetMetrics", func() error { _, err := svc.GetMetrics(context.Background(), ""); return err }},
		{"ListMessages", func() error { _, err := svc.ListMessages(context.Background(), ""); return err }},
	} {
		err := fn.call()
		if err == nil {
			t.Errorf("%s: expected error for empty ID, got nil", fn.name)
		}
	}
}
