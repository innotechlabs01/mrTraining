package workout

import (
	"context"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/domain/workout"
)

type mockRepository struct {
	templates []*workout.WorkoutTemplate
}

func (m *mockRepository) GetByID(ctx context.Context, id string) (*workout.WorkoutTemplate, error) {
	for _, t := range m.templates {
		if t.ID == id {
			return t, nil
		}
	}
	return nil, nil
}

func (m *mockRepository) ListByCoach(ctx context.Context, coachID string) ([]*workout.WorkoutTemplate, error) {
	var result []*workout.WorkoutTemplate
	for _, t := range m.templates {
		if t.CoachID == coachID {
			result = append(result, t)
		}
	}
	return result, nil
}

func (m *mockRepository) Create(ctx context.Context, template *workout.WorkoutTemplate) error {
	m.templates = append(m.templates, template)
	return nil
}

func (m *mockRepository) Update(ctx context.Context, template *workout.WorkoutTemplate) error {
	return nil
}

func (m *mockRepository) Delete(ctx context.Context, id string) error {
	return nil
}

func TestService_ListByCoach_ReturnsTemplates(t *testing.T) {
	repo := &mockRepository{
		templates: []*workout.WorkoutTemplate{
			{ID: "1", CoachID: "coach-1", Name: "Push Day"},
			{ID: "2", CoachID: "coach-1", Name: "Pull Day"},
			{ID: "3", CoachID: "coach-2", Name: "Legs Day"},
		},
	}
	svc := NewService(repo)

	templates, err := svc.ListByCoach(context.Background(), "coach-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(templates) != 2 {
		t.Errorf("expected 2 templates for coach-1, got %d", len(templates))
	}
}

func TestService_GetByID_ReturnsTemplate(t *testing.T) {
	repo := &mockRepository{
		templates: []*workout.WorkoutTemplate{
			{ID: "1", CoachID: "coach-1", Name: "Push Day"},
		},
	}
	svc := NewService(repo)

	tmpl, err := svc.GetByID(context.Background(), "1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tmpl == nil || tmpl.Name != "Push Day" {
		t.Errorf("expected template Push Day, got %+v", tmpl)
	}
}

func TestService_CreateTemplate_Success(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(repo)

	req := CreateRequest{
		CoachID: "coach-1",
		Name:    "Upper Body",
	}
	tmpl, err := svc.CreateTemplate(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tmpl.Name != "Upper Body" {
		t.Errorf("expected name Upper Body, got %s", tmpl.Name)
	}
	if tmpl.CoachID != "coach-1" {
		t.Errorf("expected coach_id coach-1, got %s", tmpl.CoachID)
	}
	if tmpl.ID == "" {
		t.Error("expected ID to be generated")
	}
}

func TestService_ListByCoach_Empty(t *testing.T) {
	repo := &mockRepository{templates: []*workout.WorkoutTemplate{}}
	svc := NewService(repo)

	templates, err := svc.ListByCoach(context.Background(), "coach-none")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(templates) != 0 {
		t.Errorf("expected 0 templates, got %d", len(templates))
	}
}

func TestService_CreateTemplate_MissingName(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(repo)

	req := CreateRequest{
		CoachID: "coach-1",
		Name:    "",
	}
	_, err := svc.CreateTemplate(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for missing name")
	}
}

func TestService_CreateTemplate_MissingCoachID(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(repo)

	req := CreateRequest{
		CoachID: "",
		Name:    "Test",
	}
	_, err := svc.CreateTemplate(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for missing coach_id")
	}
}
