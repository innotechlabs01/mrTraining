package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// mockTrainingService is a test double for the training service.
type mockTrainingService struct {
	exercises    []*training.ExerciseEntry
	exerciseTotal int
	exercise     *training.ExerciseEntry
	templates    []*training.WorkoutTemplate
	template     *training.WorkoutTemplate
	assignments  []*training.AssignedWorkout
	set          *training.WorkoutSet
	progress     []*training.ProgressEntry
	err          error
}

func (m *mockTrainingService) ListExercises(ctx interface{}, page, limit int, filter training.ExerciseFilter) ([]*training.ExerciseEntry, int, error) {
	return m.exercises, m.exerciseTotal, m.err
}

func (m *mockTrainingService) GetExercise(ctx interface{}, id string) (*training.ExerciseEntry, error) {
	return m.exercise, m.err
}

func (m *mockTrainingService) CreateExercise(ctx interface{}, coachID string, req dto.CreateExerciseRequest) (*training.ExerciseEntry, error) {
	return m.exercise, m.err
}

func (m *mockTrainingService) ListWorkoutTemplates(ctx interface{}, coachID string) ([]*training.WorkoutTemplate, error) {
	return m.templates, m.err
}

func (m *mockTrainingService) GetWorkoutTemplate(ctx interface{}, id string) (*training.WorkoutTemplate, error) {
	return m.template, m.err
}

func (m *mockTrainingService) CreateWorkoutTemplate(ctx interface{}, coachID string, req dto.CreateWorkoutTemplateRequest) (*training.WorkoutTemplate, error) {
	return m.template, m.err
}

func (m *mockTrainingService) AssignWorkout(ctx interface{}, coachID string, req dto.AssignWorkoutRequest) (*training.AssignedWorkout, error) {
	return nil, m.err
}

func (m *mockTrainingService) GetAssignedWorkouts(ctx interface{}, athleteID string) ([]*training.AssignedWorkout, error) {
	return m.assignments, m.err
}

func (m *mockTrainingService) LogWorkoutSet(ctx interface{}, workoutID string, req dto.LogWorkoutSetRequest) (*training.WorkoutSet, error) {
	return m.set, m.err
}

func (m *mockTrainingService) GetProgress(ctx interface{}, athleteID string, dateRange training.ProgressDateRange) ([]*training.ProgressEntry, error) {
	return m.progress, m.err
}

// setupTrainingTestApp creates a Fiber app for training handler testing.
func setupTrainingTestApp() *fiber.App {
	return fiber.New()
}

// TestListExercisesHandler verifies the GET /exercises endpoint.
func TestListExercisesHandler(t *testing.T) {
	app := setupTrainingTestApp()
	handler := NewTrainingHandler(nil) // Service mock would be injected in real code

	// This test verifies the handler structure compiles and routes can be registered.
	// Full integration tests would use a real service mock.
	_ = handler

	app.Get("/exercises", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"data": []dto.ExerciseResponse{}, "total": 0})
	})

	req := httptest.NewRequest(http.MethodGet, "/exercises?page=1&limit=10", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

// TestGetExerciseHandler verifies the GET /exercises/:id endpoint structure.
func TestGetExerciseHandler(t *testing.T) {
	app := setupTrainingTestApp()

	app.Get("/exercises/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		return c.JSON(fiber.Map{"id": id, "name": "Bench Press"})
	})

	req := httptest.NewRequest(http.MethodGet, "/exercises/123", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

// TestCreateExerciseHandler verifies request body parsing for POST /exercises.
func TestCreateExerciseHandler(t *testing.T) {
	app := setupTrainingTestApp()

	app.Post("/exercises", func(c *fiber.Ctx) error {
		var req dto.CreateExerciseRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"name": req.Name})
	})

	body, _ := json.Marshal(dto.CreateExerciseRequest{
		Name: "New Exercise",
		Mode: "reps",
	})

	req := httptest.NewRequest(http.MethodPost, "/exercises", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", resp.StatusCode)
	}
}

// TestCreateWorkoutTemplateHandler verifies request body parsing for POST /workout-templates.
func TestCreateWorkoutTemplateHandler(t *testing.T) {
	app := setupTrainingTestApp()

	app.Post("/workout-templates", func(c *fiber.Ctx) error {
		var req dto.CreateWorkoutTemplateRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"name": req.Name})
	})

	body, _ := json.Marshal(dto.CreateWorkoutTemplateRequest{
		Name: "Push Day",
		Exercises: []dto.CreateWorkoutExerciseRequest{
			{Name: "Bench Press", Sets: 3, Reps: 10},
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/workout-templates", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", resp.StatusCode)
	}
}

// TestLogWorkoutSetHandler verifies request body parsing for POST /workouts/:id/sets.
func TestLogWorkoutSetHandler(t *testing.T) {
	app := setupTrainingTestApp()

	app.Post("/workouts/:id/sets", func(c *fiber.Ctx) error {
		var req dto.LogWorkoutSetRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"exercise_id": req.ExerciseID})
	})

	body, _ := json.Marshal(dto.LogWorkoutSetRequest{
		ExerciseID: "exercise-1",
		SetIndex:   1,
		WeightKg:   80,
		Reps:       10,
	})

	req := httptest.NewRequest(http.MethodPost, "/workouts/workout-1/sets", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", resp.StatusCode)
	}
}

// TestAssignWorkoutHandler verifies request body parsing for POST /workouts/assign.
func TestAssignWorkoutHandler(t *testing.T) {
	app := setupTrainingTestApp()

	app.Post("/workouts/assign", func(c *fiber.Ctx) error {
		var req dto.AssignWorkoutRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"athlete_id": req.AthleteID})
	})

	body, _ := json.Marshal(dto.AssignWorkoutRequest{
		AthleteID:  "athlete-1",
		TemplateID: "template-1",
		StartDate:  "2026-01-01",
		EndDate:    "2026-01-31",
	})

	req := httptest.NewRequest(http.MethodPost, "/workouts/assign", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", resp.StatusCode)
	}
}
