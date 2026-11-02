package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// mockRunningRepository embeds domain.Repository and overrides only the methods
// needed by the handler tests. Non-overridden methods panic if called.
type mockRunningRepository struct {
	domain.Repository
	sessions    map[string]*domain.RunningSession
	templates   map[string]*domain.RunningWorkoutTemplate
	assignments map[string]*domain.RunningWorkoutAssignment
}

func newMockRunningRepository() *mockRunningRepository {
	return &mockRunningRepository{
		sessions:    make(map[string]*domain.RunningSession),
		templates:   make(map[string]*domain.RunningWorkoutTemplate),
		assignments: make(map[string]*domain.RunningWorkoutAssignment),
	}
}

// WithExecutor returns the mock itself (handler tests run without a real
// database, so the executor is never used).
func (m *mockRunningRepository) WithExecutor(domain.Executor) domain.Repository {
	return m
}

func (m *mockRunningRepository) SaveOutbox(_ context.Context, eventID, eventType, aggregateType, aggregateID, coachID, athleteID string, payload map[string]interface{}) error {
	return nil
}

func (m *mockRunningRepository) GetSession(_ context.Context, id string) (*domain.RunningSession, error) {
	s, ok := m.sessions[id]
	if !ok {
		return nil, errors.NotFound("RunningSession", id)
	}
	return s, nil
}

func (m *mockRunningRepository) UpdateSession(_ context.Context, s *domain.RunningSession) error {
	if _, ok := m.sessions[s.ID]; !ok {
		return errors.NotFound("RunningSession", s.ID)
	}
	m.sessions[s.ID] = s
	return nil
}

func (m *mockRunningRepository) SaveSession(_ context.Context, s *domain.RunningSession) error {
	m.sessions[s.ID] = s
	return nil
}

func (m *mockRunningRepository) GetTemplate(_ context.Context, id string) (*domain.RunningWorkoutTemplate, error) {
	t, ok := m.templates[id]
	if !ok {
		return nil, errors.NotFound("RunningWorkoutTemplate", id)
	}
	return t, nil
}

func (m *mockRunningRepository) SaveTemplate(_ context.Context, t *domain.RunningWorkoutTemplate) error {
	if t.ID == "" {
		t.ID = "template-1"
	}
	m.templates[t.ID] = t
	return nil
}

func (m *mockRunningRepository) GetAssignment(_ context.Context, id string) (*domain.RunningWorkoutAssignment, error) {
	a, ok := m.assignments[id]
	if !ok {
		return nil, errors.NotFound("RunningWorkoutAssignment", id)
	}
	return a, nil
}

func (m *mockRunningRepository) SaveAssignment(_ context.Context, a *domain.RunningWorkoutAssignment) error {
	if a.ID == "" {
		a.ID = "assignment-1"
	}
	m.assignments[a.ID] = a
	return nil
}

func (m *mockRunningRepository) ListAssignmentsByAthlete(_ context.Context, athleteID string, status domain.RunningWorkoutAssignmentStatus) ([]*domain.RunningWorkoutAssignment, error) {
	var result []*domain.RunningWorkoutAssignment
	for _, a := range m.assignments {
		if a.AthleteID == athleteID && (status == "" || a.Status == status) {
			result = append(result, a)
		}
	}
	if result == nil {
		result = []*domain.RunningWorkoutAssignment{}
	}
	return result, nil
}

func (m *mockRunningRepository) ListAssignmentsByCoach(_ context.Context, coachID string) ([]*domain.RunningWorkoutAssignment, error) {
	return nil, nil
}

func (m *mockRunningRepository) GetSnapshotBySession(_ context.Context, _ string) (*domain.RunningWorkoutSnapshot, error) {
	return nil, nil
}

// setupApp creates a Fiber app with the running workout handler and a middleware
// that injects the given userID into the request context (simulating RequireAuth).
func setupApp(userID string, svc *runningapp.Service) *fiber.App {
	app := fiber.New()
	if userID != "" {
		app.Use(func(c *fiber.Ctx) error {
			c.Locals(string(middleware.UserIDKey), userID)
			return c.Next()
		})
	}
	handler := NewRunningWorkoutHandler(svc)
	app.Get("/running/workouts/templates/:id", handler.GetTemplate)
	app.Get("/running/workouts/assignments/:id", handler.GetAssignment)
	app.Post("/running/workouts/sessions/:id/complete", handler.CompleteSession)
	app.Get("/running/workouts/assignments", handler.ListMyAssignments)
	app.Get("/coach/athletes/:id/running/assignments", handler.ListAssignmentsByAthlete)
	return app
}

func TestGetTemplate_OwnerCanFetch(t *testing.T) {
	repo := newMockRunningRepository()
	repo.templates["template-1"] = &domain.RunningWorkoutTemplate{
		ID:      "template-1",
		CoachID: "coach-1",
		Name:    "Morning Run",
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("coach-1", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/templates/template-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
	var template dto.RunningWorkoutTemplateResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&template))
	require.NotNil(t, template.Segments, "an empty segment list must be [], never null")
}

func TestGetTemplate_NonOwnerIsForbidden(t *testing.T) {
	repo := newMockRunningRepository()
	repo.templates["template-1"] = &domain.RunningWorkoutTemplate{
		ID:      "template-1",
		CoachID: "coach-1",
		Name:    "Morning Run",
	}
	svc := runningapp.NewService(repo, nil)

	// coach-2 tries to fetch coach-1's template
	app := setupApp("coach-2", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/templates/template-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 403, resp.StatusCode)
}

func TestGetTemplate_NoAuthIsUnauthorized(t *testing.T) {
	repo := newMockRunningRepository()
	repo.templates["template-1"] = &domain.RunningWorkoutTemplate{
		ID:      "template-1",
		CoachID: "coach-1",
		Name:    "Morning Run",
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/templates/template-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)
}

func TestGetTemplate_AssignedAthleteCanFetch(t *testing.T) {
	repo := newMockRunningRepository()
	repo.templates["template-1"] = &domain.RunningWorkoutTemplate{ID: "template-1", CoachID: "coach-1"}
	repo.assignments["assignment-1"] = &domain.RunningWorkoutAssignment{
		ID: "assignment-1", AthleteID: "athlete-1", CoachID: "coach-1", TemplateID: "template-1",
	}
	app := setupApp("athlete-1", runningapp.NewService(repo, nil))
	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/running/workouts/templates/template-1", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestCoachAssignments_DoesNotExposeAnotherCoachsAssignments(t *testing.T) {
	repo := newMockRunningRepository()
	repo.assignments["mine"] = &domain.RunningWorkoutAssignment{ID: "mine", AthleteID: "athlete-1", CoachID: "coach-1"}
	repo.assignments["other"] = &domain.RunningWorkoutAssignment{ID: "other", AthleteID: "athlete-1", CoachID: "coach-2"}
	app := setupApp("coach-1", runningapp.NewService(repo, nil))
	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/coach/athletes/athlete-1/running/assignments", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var assignments []dto.RunningWorkoutAssignmentResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&assignments))
	require.Len(t, assignments, 1)
	require.Equal(t, "mine", assignments[0].ID)
}

func TestGetAssignment_AthleteCanFetch(t *testing.T) {
	repo := newMockRunningRepository()
	repo.assignments["assignment-1"] = &domain.RunningWorkoutAssignment{
		ID:         "assignment-1",
		AthleteID:  "athlete-1",
		CoachID:    "coach-1",
		TemplateID: "template-1",
		Status:     domain.AssignmentStatusAssigned,
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("athlete-1", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/assignments/assignment-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}

func TestGetAssignment_CoachCanFetch(t *testing.T) {
	repo := newMockRunningRepository()
	repo.assignments["assignment-1"] = &domain.RunningWorkoutAssignment{
		ID:         "assignment-1",
		AthleteID:  "athlete-1",
		CoachID:    "coach-1",
		TemplateID: "template-1",
		Status:     domain.AssignmentStatusAssigned,
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("coach-1", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/assignments/assignment-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}

func TestGetAssignment_NonInvolvedUserIsForbidden(t *testing.T) {
	repo := newMockRunningRepository()
	repo.assignments["assignment-1"] = &domain.RunningWorkoutAssignment{
		ID:         "assignment-1",
		AthleteID:  "athlete-1",
		CoachID:    "coach-1",
		TemplateID: "template-1",
		Status:     domain.AssignmentStatusAssigned,
	}
	svc := runningapp.NewService(repo, nil)

	// athlete-2 is neither the athlete nor the coach of this assignment
	app := setupApp("athlete-2", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/assignments/assignment-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 403, resp.StatusCode)
}

func TestGetAssignment_NoAuthIsUnauthorized(t *testing.T) {
	repo := newMockRunningRepository()
	repo.assignments["assignment-1"] = &domain.RunningWorkoutAssignment{
		ID:         "assignment-1",
		AthleteID:  "athlete-1",
		CoachID:    "coach-1",
		TemplateID: "template-1",
		Status:     domain.AssignmentStatusAssigned,
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/assignments/assignment-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)
}

func TestCompleteSession_PreservesDateSourceCreatedAt(t *testing.T) {
	repo := newMockRunningRepository()
	repo.sessions["s-1"] = &domain.RunningSession{
		ID:        "s-1",
		UserID:    "athlete-1",
		Date:      "2026-10-18",
		Source:    domain.SourceMobileGPS,
		CreatedAt: "2026-10-18T07:00:00Z",
		Distance:  0,
		Duration:  0,
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("athlete-1", svc)
	body := map[string]interface{}{
		"distance": 10.0,
		"duration": 3000,
		"pace":     "5:00",
		"calories": 600,
	}
	bodyBytes, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/running/workouts/sessions/s-1/complete", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	// Verify the stored session preserved Date, Source, CreatedAt.
	got, err := repo.GetSession(context.Background(), "s-1")
	require.NoError(t, err)
	assert.Equal(t, "2026-10-18", got.Date, "Date should be preserved")
	assert.Equal(t, domain.SourceMobileGPS, got.Source, "Source should be preserved")
	assert.Equal(t, "2026-10-18T07:00:00Z", got.CreatedAt, "CreatedAt should be preserved")
	assert.Equal(t, 10.0, got.Distance)
}

func TestCompleteSession_RejectsNonOwner(t *testing.T) {
	repo := newMockRunningRepository()
	repo.sessions["s-1"] = &domain.RunningSession{
		ID:     "s-1",
		UserID: "athlete-1",
		Date:   "2026-10-18",
		Source: domain.SourceManual,
	}
	svc := runningapp.NewService(repo, nil)

	// athlete-2 tries to complete athlete-1's session
	app := setupApp("athlete-2", svc)
	body := map[string]interface{}{
		"distance": 5.0,
		"duration": 1500,
	}
	bodyBytes, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/running/workouts/sessions/s-1/complete", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 403, resp.StatusCode)
}

func TestListMyAssignments_ReturnsAuthenticatedAthletesAssignments(t *testing.T) {
	repo := newMockRunningRepository()
	repo.assignments["a-1"] = &domain.RunningWorkoutAssignment{
		ID:            "a-1",
		AthleteID:     "athlete-1",
		CoachID:       "coach-1",
		TemplateID:    "template-1",
		Status:        domain.AssignmentStatusAssigned,
		ScheduledDate: time.Now(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	repo.assignments["a-2"] = &domain.RunningWorkoutAssignment{
		ID:            "a-2",
		AthleteID:     "athlete-2",
		CoachID:       "coach-1",
		TemplateID:    "template-1",
		Status:        domain.AssignmentStatusAssigned,
		ScheduledDate: time.Now(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("athlete-1", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/assignments", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result []dto.RunningWorkoutAssignmentResponse
	bodyBytes, _ := io.ReadAll(resp.Body)
	require.NoError(t, json.Unmarshal(bodyBytes, &result))
	assert.Len(t, result, 1)
	assert.Equal(t, "a-1", result[0].ID)
	assert.Equal(t, "athlete-1", result[0].AthleteID)
}

func TestListMyAssignments_NoAuthIsUnauthorized(t *testing.T) {
	repo := newMockRunningRepository()
	svc := runningapp.NewService(repo, nil)

	app := setupApp("", svc)
	req := httptest.NewRequest(http.MethodGet, "/running/workouts/assignments", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)
}

func TestListAssignmentsByAthlete_CoachIDParam(t *testing.T) {
	repo := newMockRunningRepository()
	repo.assignments["a-1"] = &domain.RunningWorkoutAssignment{
		ID:            "a-1",
		AthleteID:     "athlete-1",
		CoachID:       "coach-1",
		TemplateID:    "template-1",
		Status:        domain.AssignmentStatusAssigned,
		ScheduledDate: time.Now(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("coach-1", svc)
	req := httptest.NewRequest(http.MethodGet, "/coach/athletes/athlete-1/running/assignments", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result []dto.RunningWorkoutAssignmentResponse
	bodyBytes, _ := io.ReadAll(resp.Body)
	require.NoError(t, json.Unmarshal(bodyBytes, &result))
	assert.Len(t, result, 1)
	assert.Equal(t, "athlete-1", result[0].AthleteID)
}

func TestListAssignmentsByAthlete_CoachCannotListOwnAssignments(t *testing.T) {
	repo := newMockRunningRepository()
	repo.assignments["a-1"] = &domain.RunningWorkoutAssignment{
		ID:            "a-1",
		AthleteID:     "coach-1",
		CoachID:       "coach-1",
		TemplateID:    "template-1",
		Status:        domain.AssignmentStatusAssigned,
		ScheduledDate: time.Now(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	svc := runningapp.NewService(repo, nil)

	app := setupApp("coach-1", svc)
	req := httptest.NewRequest(http.MethodGet, "/coach/athletes/coach-1/running/assignments", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 403, resp.StatusCode)
}
