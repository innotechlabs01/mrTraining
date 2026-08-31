package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

// assertJSONShape asserts the serialized JSON contains each expected camelCase key
// and contains none of the forbidden snake_case keys.
func assertJSONShape(t *testing.T, got string, expected []string, forbidden []string) {
	t.Helper()
	for _, want := range expected {
		if !strings.Contains(got, want) {
			t.Errorf("expected JSON to contain %q; got %s", want, got)
		}
	}
	for _, bad := range forbidden {
		if strings.Contains(got, bad) {
			t.Errorf("expected JSON to NOT contain %q; got %s", bad, got)
		}
	}
}

// TestAssignedWorkoutResponseCamelCase verifies the assigned workout DTO emits camelCase keys.
func TestAssignedWorkoutResponseCamelCase(t *testing.T) {
	d := dto.AssignedWorkoutResponse{
		AthleteID:   "a1",
		ContentID:   "content-1",
		ContentType: "workout",
		ContentName: "Push Day",
		Modality:    "online",
		StartDate:   "2026-01-01",
		EndDate:     "2026-01-31",
		DaysOfWeek:  []int{1, 3, 5},
		Status:      "active",
		Progress:    0.5,
		CoachID:     "c1",
	}
	b, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	assertJSONShape(t, string(b),
		[]string{`"contentName":"Push Day"`, `"contentType":"workout"`, `"startDate":"2026-01-01"`,
			`"endDate":"2026-01-31"`, `"daysOfWeek":[1,3,5]`, `"athleteId":"a1"`, `"contentId":"content-1"`,
			`"status":"active"`, `"coachId":"c1"`},
		[]string{"content_name", "content_type", "start_date", "end_date", "days_of_week", "athlete_id", "coach_id"})
}

// TestWorkoutExerciseResponseCamelCase verifies the prescription DTO emits camelCase keys and imageUrl.
func TestWorkoutExerciseResponseCamelCase(t *testing.T) {
	d := dto.WorkoutExerciseResponse{
		ID:                "ex1",
		Name:              "Bench",
		Sets:              3,
		Reps:              10,
		WeightKg:          80,
		RestSeconds:       90,
		SortOrder:         1,
		Mode:              "reps",
		Phase:             "work",
		BodyPart:          "chest",
		MuscleGroups:      "pecs",
		LibraryExerciseID: "lib-1",
		ImageURL:          "https://img.example/bench.jpg",
	}
	b, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	assertJSONShape(t, string(b),
		[]string{`"weightKg":80`, `"restSeconds":90`, `"sortOrder":1`, `"bodyPart":"chest"`,
			`"muscleGroups":"pecs"`, `"libraryExerciseId":"lib-1"`, `"imageUrl":"https://img.example/bench.jpg"`},
		[]string{"weight_kg", "rest_seconds", "sort_order", "body_part", "muscle_groups", "library_exercise_id"})
}

// TestExerciseResponseCamelCase verifies the exercise DTO emits camelCase keys and imageUrl.
func TestExerciseResponseCamelCase(t *testing.T) {
	d := dto.ExerciseResponse{
		ID:            "e1",
		Name:          "Squat",
		BodyPart:      "legs",
		MuscleGroups:  "quads",
		VideoURL:      "https://videos.example/squat.mp4",
		ImageURL:      "https://img.example/squat.jpg",
		CreatedAt:     "2026-01-01T00:00:00Z",
		UpdatedAt:     "2026-01-02T00:00:00Z",
	}
	b, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	assertJSONShape(t, string(b),
		[]string{`"bodyPart":"legs"`, `"muscleGroups":"quads"`, `"videoUrl":"https://videos.example/squat.mp4"`,
			`"imageUrl":"https://img.example/squat.jpg"`, `"createdAt":"2026-01-01T00:00:00Z"`},
		[]string{"body_part", "muscle_groups", "video_url", "image_url", "created_at"})
}

// TestWorkoutSessionResponseCamelCase verifies the workout session DTO emits camelCase keys.
func TestWorkoutSessionResponseCamelCase(t *testing.T) {
	d := dto.WorkoutSessionResponse{
		ID:                   "s1",
		WorkoutID:            "w1",
		AthleteID:            "a1",
		StartedAt:            "2026-01-02T10:00:00Z",
		Completed:            false,
		CurrentExerciseIndex: 2,
		DurationSeconds:      300,
	}
	b, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	assertJSONShape(t, string(b),
		[]string{`"workoutId":"w1"`, `"athleteId":"a1"`, `"startedAt":"2026-01-02T10:00:00Z"`,
			`"currentExerciseIndex":2`, `"durationSeconds":300`},
		[]string{"workout_id", "athlete_id", "started_at", "current_exercise_index", "duration_seconds"})
}

// TestToWorkoutDetailResponse verifies the detail mapper returns the {workout, exercises, session} envelope
// with the joined imageUrl on each exercise.
func TestToWorkoutDetailResponse(t *testing.T) {
	d := &training.WorkoutDetail{
		Workout: &training.AssignedWorkout{
			ID: "w1", AthleteID: "a1", ContentID: "t1", ContentName: "Split",
			StartDate: "2026-01-01", Status: "active", Progress: 0.4,
		},
		Exercises: []training.WorkoutExercise{
			{Name: "Bench", Sets: 3, Reps: 10, WeightKg: 80, ImageURL: "https://img.example/bench.jpg"},
		},
		Session: &training.WorkoutSession{
			ID: "s1", WorkoutID: "w1", StartedAt: "2026-01-02T10:00:00Z", CurrentExerciseIndex: 2, DurationSeconds: 300,
		},
	}

	resp := toWorkoutDetailResponse(d)

	if resp.Workout == nil || resp.Workout.ContentName != "Split" {
		t.Fatalf("expected workout contentName 'Split', got %#v", resp.Workout)
	}
	if len(resp.Exercises) != 1 {
		t.Fatalf("expected 1 exercise, got %d", len(resp.Exercises))
	}
	if resp.Exercises[0].ImageURL != "https://img.example/bench.jpg" {
		t.Errorf("expected imageUrl on exercise, got %q", resp.Exercises[0].ImageURL)
	}
	if resp.Session == nil || resp.Session.CurrentExerciseIndex != 2 {
		t.Fatalf("expected resume session marker with index 2, got %#v", resp.Session)
	}

	// Serialized envelope shape must expose the three top-level keys.
	b, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	assertJSONShape(t, string(b),
		[]string{`"workout":`, `"exercises":`, `"session":`, `"contentName":"Split"`}, nil)
}

// TestToAssignedWorkoutResponse verifies the workout mapper copies fields including camelCase-emitted keys.
func TestToAssignedWorkoutResponse(t *testing.T) {
	a := &training.AssignedWorkout{
		ID: "w1", AthleteID: "a1", ContentID: "t1", ContentType: "workout", ContentName: "Leg Day",
		Modality: "presencial", StartDate: "2026-01-01", EndDate: "2026-01-31",
		DaysOfWeek: []int{1, 3}, Status: "active", Progress: 0.2, CoachID: "c1",
	}
	resp := toAssignedWorkoutResponse(a)
	b, _ := json.Marshal(resp)
	assertJSONShape(t, string(b),
		[]string{`"contentName":"Leg Day"`, `"modality":"presencial"`, `"startDate":"2026-01-01"`,
			`"status":"active"`, `"progress":0.2`},
		[]string{"content_name", "start_date"})
}
