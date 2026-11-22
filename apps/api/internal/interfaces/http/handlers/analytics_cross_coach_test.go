package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	analyticsapp "github.com/innotechlabs01/mr-training-api/internal/application/analytics"
	analyticsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/analytics"
	analyticsinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/analytics"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type fakeAnalyticsHandlerRepoFull struct{}

func (fakeAnalyticsHandlerRepoFull) GetDashboardSummary(ctx context.Context, coachID string) (*analyticsdomain.DashboardSummary, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetHRZones(ctx context.Context, athleteID string) ([]analyticsdomain.HRZone, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetFatigueMap(ctx context.Context, athleteID string) ([]analyticsdomain.FatigueMap, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetOneRM(ctx context.Context, athleteID string) ([]analyticsdomain.OneRM, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetTrainingSummary(ctx context.Context, coachID string) (*analyticsdomain.TrainingSummary, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetEffort(ctx context.Context, athleteID string) ([]analyticsdomain.Effort, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetAthleteTrainingSummary(ctx context.Context, athleteID string, days int) (*analyticsdomain.AthleteTrainingSummary, error) {
	return &analyticsdomain.AthleteTrainingSummary{
		AthleteID:      athleteID,
		WindowDays:     days,
		RecentSessions: []analyticsdomain.RecentTrainingSession{},
	}, nil
}
func (fakeAnalyticsHandlerRepoFull) GetAthleteVideoAnalytics(ctx context.Context, athleteID string) ([]analyticsdomain.AthleteVideoAnalytics, error) {
	return []analyticsdomain.AthleteVideoAnalytics{}, nil
}

type analyticsCrossTenantDeny struct{}

func (analyticsCrossTenantDeny) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	return userID, nil
}
func (analyticsCrossTenantDeny) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return false, nil
}

func makeAnalyticsHandler(repo analyticsdomain.Repository, resolver middleware.TenantResolver) *AnalyticsHandler {
	return &AnalyticsHandler{service: analyticsapp.NewService(repo), db: nil, tenantResolver: resolver}
}

func TestAnalyticsAthleteSelfAllowed(t *testing.T) {
	h := makeAnalyticsHandler(fakeAnalyticsHandlerRepoFull{}, analyticsCrossTenantDeny{})
	for _, ep := range []struct{ name, path string }{
		{"HRZones", "/athlete/alice/analytics/hr-zones"},
		{"FatigueMap", "/athlete/alice/analytics/fatigue-map"},
		{"OneRM", "/athlete/alice/analytics/one-rm"},
		{"Effort", "/athlete/alice/analytics/effort"},
	} {
		t.Run(ep.name, func(t *testing.T) {
			app := fiber.New()
			route := "/athlete/:athleteId/analytics/hr-zones"
			if ep.name == "FatigueMap" { route = "/athlete/:athleteId/analytics/fatigue-map" }
			if ep.name == "OneRM" { route = "/athlete/:athleteId/analytics/one-rm" }
			if ep.name == "Effort" { route = "/athlete/:athleteId/analytics/effort" }
			app.Get(route, func(c *fiber.Ctx) error {
				c.Locals(string(middleware.UserIDKey), "alice")
				switch ep.name {
				case "HRZones":
					return h.GetHRZones(c)
				case "FatigueMap":
					return h.GetFatigueMap(c)
				case "OneRM":
					return h.GetOneRM(c)
				case "Effort":
					return h.GetEffort(c)
				}
				return nil
			})
			resp, err := app.Test(httptest.NewRequest("GET", ep.path, nil))
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != fiber.StatusOK {
				t.Fatalf("%s self expected 200, got %d", ep.name, resp.StatusCode)
			}
		})
	}
}

func TestAnalyticsAthleteCrossDenied(t *testing.T) {
	h := makeAnalyticsHandler(fakeAnalyticsHandlerRepoFull{}, analyticsCrossTenantDeny{})
	for _, ep := range []struct{ name, path string }{
		{"HRZones", "/athlete/bob/analytics/hr-zones"},
		{"FatigueMap", "/athlete/bob/analytics/fatigue-map"},
		{"OneRM", "/athlete/bob/analytics/one-rm"},
		{"Effort", "/athlete/bob/analytics/effort"},
	} {
		t.Run(ep.name, func(t *testing.T) {
			app := fiber.New()
			route := "/athlete/:athleteId/analytics/hr-zones"
			if ep.name == "FatigueMap" { route = "/athlete/:athleteId/analytics/fatigue-map" }
			if ep.name == "OneRM" { route = "/athlete/:athleteId/analytics/one-rm" }
			if ep.name == "Effort" { route = "/athlete/:athleteId/analytics/effort" }
			app.Get(route, func(c *fiber.Ctx) error {
				c.Locals(string(middleware.UserIDKey), "coach-a")
				switch ep.name {
				case "HRZones":
					return h.GetHRZones(c)
				case "FatigueMap":
					return h.GetFatigueMap(c)
				case "OneRM":
					return h.GetOneRM(c)
				case "Effort":
					return h.GetEffort(c)
				}
				return nil
			})
			resp, err := app.Test(httptest.NewRequest("GET", ep.path, nil))
			if err != nil {
				t.Fatal(err)
			}
			t.Logf("%s STATUS=%d", ep.name, resp.StatusCode)
			if resp.StatusCode != fiber.StatusForbidden {
				t.Fatalf("%s cross expected 403, got %d", ep.name, resp.StatusCode)
			}
		})
	}
}

type analyticsCrossTenantAllow struct{}

func (analyticsCrossTenantAllow) GetActiveCoachID(context.Context, string) (string, error) {
	return "coach-1", nil
}
func (analyticsCrossTenantAllow) AthleteHasActiveCoach(context.Context, string, string) (bool, error) {
	return true, nil
}

type analyticsDaysCaptureRepo struct {
	fakeAnalyticsHandlerRepoFull
	lastAthleteID string
	lastDays      int
}

func (r *analyticsDaysCaptureRepo) GetAthleteTrainingSummary(_ context.Context, athleteID string, days int) (*analyticsdomain.AthleteTrainingSummary, error) {
	r.lastAthleteID = athleteID
	r.lastDays = days
	return &analyticsdomain.AthleteTrainingSummary{
		AthleteID:          athleteID,
		WindowDays:         days,
		Sessions:           2,
		AvgSessionsPerWeek: 1,
		TotalSets:          12,
		TotalVolumeKg:      960,
		RecentSessions:     []analyticsdomain.RecentTrainingSession{{Date: "2026-03-01", WorkoutName: "Push", Exercises: 4}},
	}, nil
}

func TestAnalytics_AthleteTrainingSummary_WithDaysAndActiveCoach(t *testing.T) {
	t.Run("athlete self forwards clamped days query param", func(t *testing.T) {
		repo := &analyticsDaysCaptureRepo{}
		h := NewAnalyticsHandler(analyticsapp.NewService(repo), nil, analyticsCrossTenantDeny{})

		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "alice", Role: "athlete"})
			return c.Next()
		})
		app.Get("/athlete/:athleteId/analytics/training-summary", h.GetAthleteTrainingSummary)

		for _, tc := range []struct {
			query    string
			wantDays int
		}{
			{query: "?days=14", wantDays: 14},
			{query: "?days=0", wantDays: 28},
			{query: "?days=999", wantDays: 365},
		} {
			resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/athlete/alice/analytics/training-summary"+tc.query, nil))
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, resp.StatusCode)
			require.Equal(t, "alice", repo.lastAthleteID)
			require.Equal(t, tc.wantDays, repo.lastDays)
		}
	})

	t.Run("blocks unlinked coach and unauthenticated requests", func(t *testing.T) {
		repo := &analyticsDaysCaptureRepo{}
		hDenied := NewAnalyticsHandler(analyticsapp.NewService(repo), nil, analyticsCrossTenantDeny{})

		appNoAuth := fiber.New()
		appNoAuth.Get("/athlete/:athleteId/analytics/training-summary", hDenied.GetAthleteTrainingSummary)
		r401, err := appNoAuth.Test(httptest.NewRequest(http.MethodGet, "/athlete/alice/analytics/training-summary", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusUnauthorized, r401.StatusCode)

		appCoachDenied := fiber.New()
		appCoachDenied.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-other", Role: "coach"})
			return c.Next()
		})
		appCoachDenied.Get("/athlete/:athleteId/analytics/training-summary", hDenied.GetAthleteTrainingSummary)
		r403, err := appCoachDenied.Test(httptest.NewRequest(http.MethodGet, "/athlete/alice/analytics/training-summary", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, r403.StatusCode)
	})

	t.Run("linked coach runs inside UnitOfWork RLS transaction", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectBegin()
		mock.ExpectExec("SELECT set_config").WithArgs("coach-1").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("SELECT set_config").WithArgs("coach-tenant-1").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("SELECT set_config").WithArgs("coach").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectQuery(`SELECT COUNT\(DISTINCT wsl\.id\)`).
			WithArgs("alice", sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sessions", "total_sets", "total_volume"}).AddRow(3, 18, 1200.5))
		mock.ExpectQuery(`SELECT LEFT\(wsl\.started_at, 10\) AS session_date`).
			WithArgs("alice").
			WillReturnRows(sqlmock.NewRows([]string{"session_date", "workout_name", "exercises"}).
				AddRow("2026-03-01", "Upper", 4))
		mock.ExpectCommit()

		h := NewAnalyticsHandler(analyticsapp.NewService(analyticsinfra.NewRepository(db)), db, analyticsCrossTenantAllow{})
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-1", Role: "coach"})
			c.Locals(middleware.CoachIDKey, "coach-tenant-1")
			return c.Next()
		})
		app.Get("/athlete/:athleteId/analytics/training-summary", h.GetAthleteTrainingSummary)

		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/athlete/alice/analytics/training-summary?days=21", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var out analyticsdomain.AthleteTrainingSummary
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
		require.Equal(t, "alice", out.AthleteID)
		require.Equal(t, 21, out.WindowDays)
		require.Equal(t, 3, out.Sessions)
		require.Equal(t, 18, out.TotalSets)
		require.Equal(t, 1200.5, out.TotalVolumeKg)
		require.Len(t, out.RecentSessions, 1)
		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestAnalytics_CoachVideoAnalytics_GuardsAndUoW(t *testing.T) {
	t.Run("rejects unauthenticated unlinked coach and nil resolver", func(t *testing.T) {
		hDenied := NewAnalyticsHandler(analyticsapp.NewService(fakeAnalyticsHandlerRepoFull{}), nil, analyticsCrossTenantDeny{})
		appNoAuth := fiber.New()
		appNoAuth.Get("/coach/athletes/:athleteId/video-analytics", hDenied.GetAthleteVideoAnalytics)
		r401, err := appNoAuth.Test(httptest.NewRequest(http.MethodGet, "/coach/athletes/alice/video-analytics", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusUnauthorized, r401.StatusCode)

		appDenied := fiber.New()
		appDenied.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-b", Role: "coach"})
			return c.Next()
		})
		appDenied.Get("/coach/athletes/:athleteId/video-analytics", hDenied.GetAthleteVideoAnalytics)
		r403, err := appDenied.Test(httptest.NewRequest(http.MethodGet, "/coach/athletes/alice/video-analytics", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, r403.StatusCode)

		hNilResolver := NewAnalyticsHandler(analyticsapp.NewService(fakeAnalyticsHandlerRepoFull{}), nil, nil)
		appNilRes := fiber.New()
		appNilRes.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-1", Role: "coach"})
			return c.Next()
		})
		appNilRes.Get("/coach/athletes/:athleteId/video-analytics", hNilResolver.GetAthleteVideoAnalytics)
		r403Nil, err := appNilRes.Test(httptest.NewRequest(http.MethodGet, "/coach/athletes/alice/video-analytics", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, r403Nil.StatusCode)
	})

	t.Run("linked coach executes video analytics query in UnitOfWork RLS", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		viewedAt := time.Date(2026, 3, 2, 10, 0, 0, 0, time.UTC)
		mock.ExpectBegin()
		mock.ExpectExec("SELECT set_config").WithArgs("coach-1").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("SELECT set_config").WithArgs("coach-tenant-1").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("SELECT set_config").WithArgs("coach").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectQuery(`FROM video_views vv\s+LEFT JOIN exercise_library el ON el\.id = vv\.exercise_id\s+WHERE vv\.athlete_id = \$1`).
			WithArgs("alice").
			WillReturnRows(sqlmock.NewRows([]string{
				"exercise_id", "exercise_name", "total_views", "completed_views", "avg_position_pct", "last_viewed_at",
			}).AddRow("ex-1", "Squat", 3, 2, 85.0, viewedAt))
		mock.ExpectCommit()

		h := NewAnalyticsHandler(analyticsapp.NewService(analyticsinfra.NewRepository(db)), db, analyticsCrossTenantAllow{})
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-1", Role: "coach"})
			c.Locals(middleware.CoachIDKey, "coach-tenant-1")
			return c.Next()
		})
		app.Get("/coach/athletes/:athleteId/video-analytics", h.GetAthleteVideoAnalytics)

		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/coach/athletes/alice/video-analytics", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var out struct {
			Analytics []analyticsdomain.AthleteVideoAnalytics `json:"analytics"`
		}
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
		require.Len(t, out.Analytics, 1)
		require.Equal(t, "ex-1", out.Analytics[0].ExerciseID)
		require.Equal(t, "Squat", out.Analytics[0].ExerciseName)
		require.Equal(t, 3, out.Analytics[0].TotalViews)
		require.Equal(t, 2, out.Analytics[0].CompletedViews)
		require.NotNil(t, out.Analytics[0].CompletionRate)
		require.Equal(t, 67, *out.Analytics[0].CompletionRate)
		require.NotNil(t, out.Analytics[0].AvgPositionPct)
		require.Equal(t, 85.0, *out.Analytics[0].AvgPositionPct)
		require.NotNil(t, out.Analytics[0].LastViewedAt)
		require.Equal(t, "2026-03-02T10:00:00Z", *out.Analytics[0].LastViewedAt)
		require.NoError(t, mock.ExpectationsWereMet())
	})
}

