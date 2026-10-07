package formrecording

import (
	"context"
	"errors"
	"testing"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/formrecording"
)

// mockRepository implements formrecording.Repository for testing.
type mockRepository struct {
	insertFn func(ctx context.Context, rec *domain.FormRecording) error
}

func (m *mockRepository) Insert(ctx context.Context, rec *domain.FormRecording) error {
	return m.insertFn(ctx, rec)
}

func TestUpload_Success(t *testing.T) {
	var captured *domain.FormRecording
	mock := &mockRepository{
		insertFn: func(ctx context.Context, rec *domain.FormRecording) error {
			captured = rec
			return nil
		},
	}

	svc := NewService(mock)
	in := UploadInput{
		ExerciseID:  "squat",
		WorkoutID:   "wk-1",
		FormScore:   87.5,
		FormMetrics: `{"depth":0.9,"alignment":0.8,"tempo":0.7}`,
		VideoURL:    "/uploads/form-recordings/form-squat-20260101120000.mp4",
	}

	rec, err := svc.Upload(context.Background(), "athlete-1", in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rec.ID == "" {
		t.Error("expected auto-generated ID, got empty")
	}
	if rec.CreatedAt == "" {
		t.Error("expected CreatedAt to be set, got empty")
	}
	if captured == nil {
		t.Fatal("expected repository Insert to be called")
	}
	if captured.AthleteID != "athlete-1" {
		t.Errorf("expected athlete ID %q, got %q", "athlete-1", captured.AthleteID)
	}
	if captured.FormScore != 87.5 {
		t.Errorf("expected form score %v, got %v", 87.5, captured.FormScore)
	}
}

func TestUpload_DefaultsMetricsToEmptyObject(t *testing.T) {
	var captured *domain.FormRecording
	mock := &mockRepository{
		insertFn: func(ctx context.Context, rec *domain.FormRecording) error {
			captured = rec
			return nil
		},
	}

	svc := NewService(mock)
	rec, err := svc.Upload(context.Background(), "athlete-1", UploadInput{
		ExerciseID: "deadlift",
		FormScore:  70,
		VideoURL:   "/uploads/form-recordings/form-deadlift-1.mp4",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rec.FormMetrics != "{}" {
		t.Errorf("expected default form metrics %q, got %q", "{}", rec.FormMetrics)
	}
	if captured.WorkoutID != "" {
		t.Errorf("expected empty workout ID, got %q", captured.WorkoutID)
	}
}

func TestUpload_ValidationErrors(t *testing.T) {
	svc := NewService(&mockRepository{
		insertFn: func(ctx context.Context, rec *domain.FormRecording) error { return nil },
	})

	cases := []struct {
		name      string
		athleteID string
		in        UploadInput
	}{
		{"missing athlete", "", UploadInput{ExerciseID: "squat", VideoURL: "/u.mp4"}},
		{"missing exercise", "a1", UploadInput{VideoURL: "/u.mp4"}},
		{"missing video URL", "a1", UploadInput{ExerciseID: "squat"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := svc.Upload(context.Background(), tc.athleteID, tc.in); err == nil {
				t.Error("expected validation error, got nil")
			}
		})
	}
}

func TestUpload_RepoErrorPropagates(t *testing.T) {
	repoErr := errors.New("db down")
	svc := NewService(&mockRepository{
		insertFn: func(ctx context.Context, rec *domain.FormRecording) error { return repoErr },
	})

	_, err := svc.Upload(context.Background(), "a1", UploadInput{
		ExerciseID: "squat",
		VideoURL:   "/u.mp4",
	})
	if err == nil {
		t.Fatal("expected repository error to propagate, got nil")
	}
	if !errors.Is(err, repoErr) {
		t.Errorf("expected wrapped repo error, got %v", err)
	}
}
