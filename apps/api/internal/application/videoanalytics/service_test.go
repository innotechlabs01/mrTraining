package videoanalytics

import (
	"context"
	"fmt"
	"testing"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/videoanalytics"
)

// mockRepository implements videoanalytics.Repository for testing.
type mockRepository struct {
	createSessionFn         func(ctx context.Context, session *domain.SessionAnalysis) error
	getSessionFn            func(ctx context.Context, sessionID string) (*domain.SessionAnalysis, error)
	listSessionsByAthleteFn func(ctx context.Context, athleteID string, limit int, offset int) ([]*domain.SessionAnalysis, error)
	listSessionsByExerciseFn func(ctx context.Context, athleteID string, exerciseID string, limit int) ([]*domain.SessionAnalysis, error)
	getSummaryFn            func(ctx context.Context, athleteID string) (*domain.AnalyticsSummary, error)
	getPerExerciseFn        func(ctx context.Context, athleteID string) ([]*domain.ExerciseAnalytics, error)
}

func (m *mockRepository) CreateSession(ctx context.Context, session *domain.SessionAnalysis) error {
	return m.createSessionFn(ctx, session)
}

func (m *mockRepository) GetSession(ctx context.Context, sessionID string) (*domain.SessionAnalysis, error) {
	return m.getSessionFn(ctx, sessionID)
}

func (m *mockRepository) ListSessionsByAthlete(ctx context.Context, athleteID string, limit int, offset int) ([]*domain.SessionAnalysis, error) {
	return m.listSessionsByAthleteFn(ctx, athleteID, limit, offset)
}

func (m *mockRepository) ListSessionsByExercise(ctx context.Context, athleteID string, exerciseID string, limit int) ([]*domain.SessionAnalysis, error) {
	return m.listSessionsByExerciseFn(ctx, athleteID, exerciseID, limit)
}

func (m *mockRepository) GetSummary(ctx context.Context, athleteID string) (*domain.AnalyticsSummary, error) {
	return m.getSummaryFn(ctx, athleteID)
}

func (m *mockRepository) GetPerExercise(ctx context.Context, athleteID string) ([]*domain.ExerciseAnalytics, error) {
	return m.getPerExerciseFn(ctx, athleteID)
}

func TestTrackSession_Success(t *testing.T) {
	mock := &mockRepository{
		createSessionFn: func(ctx context.Context, session *domain.SessionAnalysis) error {
			return nil
		},
	}

	svc := NewService(mock)
	session := &domain.SessionAnalysis{
		AthleteID:    "a1",
		ExerciseID:   "e1",
		ExerciseName: "Squat",
		DurationSec:  60,
		RepCount:     10,
		AvgFormScore: 85.5,
		MinFormScore: 70.0,
		MaxFormScore: 95.0,
	}

	err := svc.TrackSession(context.Background(), session)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.ID == "" {
		t.Error("expected auto-generated ID, got empty")
	}
}

func TestTrackSession_WithExistingID_PreservesIt(t *testing.T) {
	var capturedSession *domain.SessionAnalysis
	mock := &mockRepository{
		createSessionFn: func(ctx context.Context, session *domain.SessionAnalysis) error {
			capturedSession = session
			return nil
		},
	}

	svc := NewService(mock)
	session := &domain.SessionAnalysis{
		ID:        "existing-id",
		AthleteID: "a1",
	}

	err := svc.TrackSession(context.Background(), session)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedSession.ID != "existing-id" {
		t.Errorf("expected existing ID preserved, got '%s'", capturedSession.ID)
	}
}

func TestTrackSession_Error(t *testing.T) {
	mock := &mockRepository{
		createSessionFn: func(ctx context.Context, session *domain.SessionAnalysis) error {
			return fmt.Errorf("db error")
		},
	}

	svc := NewService(mock)
	session := &domain.SessionAnalysis{AthleteID: "a1"}
	err := svc.TrackSession(context.Background(), session)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestGetSummary_Success(t *testing.T) {
	mock := &mockRepository{
		getSummaryFn: func(ctx context.Context, athleteID string) (*domain.AnalyticsSummary, error) {
			return &domain.AnalyticsSummary{
				TotalSessions:    5,
				TotalReps:        50,
				AvgFormScore:     82.5,
				TotalDurationMin: 15,
				ExerciseCount:    3,
			}, nil
		},
	}

	svc := NewService(mock)
	summary, err := svc.GetSummary(context.Background(), "a1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if summary.TotalSessions != 5 {
		t.Errorf("expected 5 sessions, got %d", summary.TotalSessions)
	}
	if summary.TotalReps != 50 {
		t.Errorf("expected 50 reps, got %d", summary.TotalReps)
	}
	if summary.ExerciseCount != 3 {
		t.Errorf("expected 3 exercises, got %d", summary.ExerciseCount)
	}
}

func TestGetSummary_Error(t *testing.T) {
	mock := &mockRepository{
		getSummaryFn: func(ctx context.Context, athleteID string) (*domain.AnalyticsSummary, error) {
			return nil, fmt.Errorf("not found")
		},
	}

	svc := NewService(mock)
	_, err := svc.GetSummary(context.Background(), "a1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestGetPerExercise_Success(t *testing.T) {
	mock := &mockRepository{
		getPerExerciseFn: func(ctx context.Context, athleteID string) ([]*domain.ExerciseAnalytics, error) {
			return []*domain.ExerciseAnalytics{
				{ExerciseID: "e1", ExerciseName: "Squat", TotalSessions: 3, AvgFormScore: 85.0},
				{ExerciseID: "e2", ExerciseName: "Bench Press", TotalSessions: 2, AvgFormScore: 78.0},
			}, nil
		},
	}

	svc := NewService(mock)
	stats, err := svc.GetPerExercise(context.Background(), "a1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(stats) != 2 {
		t.Fatalf("expected 2 exercises, got %d", len(stats))
	}
	if stats[0].ExerciseName != "Squat" {
		t.Errorf("expected exercise 'Squat', got '%s'", stats[0].ExerciseName)
	}
}

func TestGetPerExercise_Empty(t *testing.T) {
	mock := &mockRepository{
		getPerExerciseFn: func(ctx context.Context, athleteID string) ([]*domain.ExerciseAnalytics, error) {
			return []*domain.ExerciseAnalytics{}, nil
		},
	}

	svc := NewService(mock)
	stats, err := svc.GetPerExercise(context.Background(), "a1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(stats) != 0 {
		t.Errorf("expected 0 exercises, got %d", len(stats))
	}
}

func TestGetSessions_Success(t *testing.T) {
	mock := &mockRepository{
		listSessionsByAthleteFn: func(ctx context.Context, athleteID string, limit int, offset int) ([]*domain.SessionAnalysis, error) {
			return []*domain.SessionAnalysis{
				{ID: "s1", AthleteID: athleteID, ExerciseName: "Squat"},
			}, nil
		},
	}

	svc := NewService(mock)
	sessions, err := svc.GetSessions(context.Background(), "a1", 20, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
}

func TestGetSessions_DefaultLimit(t *testing.T) {
	var capturedLimit int
	mock := &mockRepository{
		listSessionsByAthleteFn: func(ctx context.Context, athleteID string, limit int, offset int) ([]*domain.SessionAnalysis, error) {
			capturedLimit = limit
			return []*domain.SessionAnalysis{}, nil
		},
	}

	svc := NewService(mock)
	_, err := svc.GetSessions(context.Background(), "a1", 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedLimit != 20 {
		t.Errorf("expected default limit 20, got %d", capturedLimit)
	}
}
