package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	athleteapp "github.com/innotechlabs01/mr-training-api/internal/application/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/domain/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// mockAthleteRepository is a test double for athlete.Repository.
type mockAthleteRepository struct {
	workouts []*athlete.WorkoutSummary
	metrics  []*athlete.MetricPoint
	messages []*athlete.MessageThread
	err      error
	athlete  *athlete.Athlete
}

func (m *mockAthleteRepository) GetByID(context.Context, string) (*athlete.Athlete, error) {
	return m.athlete, m.err
}
func (m *mockAthleteRepository) GetWorkouts(context.Context, string) ([]*athlete.WorkoutSummary, error) {
	return m.workouts, m.err
}
func (m *mockAthleteRepository) GetMetrics(context.Context, string) ([]*athlete.MetricPoint, error) {
	return m.metrics, m.err
}
func (m *mockAthleteRepository) GetMessages(context.Context, string) ([]*athlete.MessageThread, error) {
	return m.messages, m.err
}

func setupAthleteTestApp(handler *AthleteHandler) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), c.Get("X-User-ID"))
		c.Locals(string(middleware.UserRoleKey), c.Get("X-User-Role"))
		return c.Next()
	})
	athletes := app.Group("/athletes")
	athletes.Get("/:id/workouts", handler.GetWorkouts)
	athletes.Get("/:id/metrics", handler.GetMetrics)
	athletes.Get("/:id/messages", handler.GetMessages)
	return app
}

func TestGetWorkoutsHandler(t *testing.T) {
	repo := &mockAthleteRepository{
		workouts: []*athlete.WorkoutSummary{{ID: "w-1", Name: "Tempo Run", Status: "scheduled"}},
	}
	handler := NewAthleteHandler(athleteapp.NewService(repo))
	app := setupAthleteTestApp(handler)

	req := httptest.NewRequest(http.MethodGet, "/athletes/ath-1/workouts", nil)
	req.Header.Set("X-User-ID", "ath-1")
	req.Header.Set("X-User-Role", "athlete")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var body struct {
		Data  []map[string]interface{} `json:"data"`
		Total int                      `json:"total"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if len(body.Data) != 1 || body.Total != 1 {
		t.Fatalf("unexpected body: %+v", body)
	}
}

func TestGetWorkoutsForbiddenForOtherAthlete(t *testing.T) {
	handler := NewAthleteHandler(athleteapp.NewService(&mockAthleteRepository{}))
	app := setupAthleteTestApp(handler)

	req := httptest.NewRequest(http.MethodGet, "/athletes/other-athlete/workouts", nil)
	req.Header.Set("X-User-ID", "ath-1")
	req.Header.Set("X-User-Role", "athlete")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}

func TestGetWorkoutsCoachAllowed(t *testing.T) {
	repo := &mockAthleteRepository{workouts: []*athlete.WorkoutSummary{{ID: "w-1"}}}
	handler := NewAthleteHandler(athleteapp.NewService(repo))
	app := setupAthleteTestApp(handler)

	req := httptest.NewRequest(http.MethodGet, "/athletes/ath-1/workouts", nil)
	req.Header.Set("X-User-ID", "coach-1")
	req.Header.Set("X-User-Role", "coach")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for coach, got %d", resp.StatusCode)
	}
}

func TestGetMetricsHandler(t *testing.T) {
	repo := &mockAthleteRepository{
		metrics: []*athlete.MetricPoint{{MetricDate: "2026-01-01", WeightKg: 72.5}},
	}
	handler := NewAthleteHandler(athleteapp.NewService(repo))
	app := setupAthleteTestApp(handler)

	req := httptest.NewRequest(http.MethodGet, "/athletes/ath-1/metrics", nil)
	req.Header.Set("X-User-ID", "ath-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var body struct {
		Data  []map[string]interface{} `json:"data"`
		Total int                      `json:"total"`
	}
	json.NewDecoder(resp.Body).Decode(&body)
	if len(body.Data) != 1 {
		t.Fatalf("expected 1 metric, got %d", len(body.Data))
	}
}

func TestGetMessagesHandler(t *testing.T) {
	repo := &mockAthleteRepository{
		messages: []*athlete.MessageThread{{ID: "t-1", CoachID: "coach-1", Subject: "Hi"}},
	}
	handler := NewAthleteHandler(athleteapp.NewService(repo))
	app := setupAthleteTestApp(handler)

	req := httptest.NewRequest(http.MethodGet, "/athletes/ath-1/messages", nil)
	req.Header.Set("X-User-ID", "ath-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var body struct {
		Data  []map[string]interface{} `json:"data"`
		Total int                      `json:"total"`
	}
	json.NewDecoder(resp.Body).Decode(&body)
	if len(body.Data) != 1 || body.Total != 1 {
		t.Fatalf("unexpected body: %+v", body)
	}
}

func TestHandlerRepoErrorMapsTo404(t *testing.T) {
	repo := &mockAthleteRepository{err: errors.NotFound("Athlete", "ath-1")}
	handler := NewAthleteHandler(athleteapp.NewService(repo))
	app := setupAthleteTestApp(handler)

	req := httptest.NewRequest(http.MethodGet, "/athletes/ath-1/workouts", nil)
	req.Header.Set("X-User-ID", "ath-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestMissingAthleteID(t *testing.T) {
	handler := NewAthleteHandler(athleteapp.NewService(&mockAthleteRepository{}))
	app := setupAthleteTestApp(handler)

	req := httptest.NewRequest(http.MethodGet, "/athletes//workouts", nil)
	req.Header.Set("X-User-ID", "ath-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}
