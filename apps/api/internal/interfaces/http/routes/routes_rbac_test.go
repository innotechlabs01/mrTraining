package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

func TestRoutes_RequireCoachRBACForProtectedEndpoints(t *testing.T) {
	app := fiber.New()
	api := app.Group("/api/v1", func(c *fiber.Ctx) error {
		middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "athlete-1", Role: "athlete"})
		return c.Next()
	})

	RegisterTestimonialRoutes(api, handlers.NewTestimonialHandler(nil))
	RegisterFormMetricsRoutes(api, handlers.NewFormMetricsHandler(nil))
	RegisterCoachFormMetricsRoutes(api, handlers.NewFormMetricsHandler(nil))
	RegisterCoachAthleteRoutes(api, handlers.NewCoachHandler(nil, nil))
	RegisterCoachFeedRoutes(api, handlers.NewCoachFeedHandler(nil))
	RegisterTrainingRoutes(api, handlers.NewTrainingHandler(nil), nil)
	RegisterAnalyticsRoutes(api, handlers.NewAnalyticsHandler(nil, nil, nil))

	coachOnlyRoutes := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/v1/testimonials"},
		{http.MethodPut, "/api/v1/testimonials/t1"},
		{http.MethodDelete, "/api/v1/testimonials/t1"},
		{http.MethodGet, "/api/v1/form-metrics/athlete/a1"},
		{http.MethodGet, "/api/v1/coach/form-metrics"},
		{http.MethodGet, "/api/v1/coach/athletes/a1"},
		{http.MethodPut, "/api/v1/coach/athletes/a1"},
		{http.MethodDelete, "/api/v1/coach/athletes/a1"},
		{http.MethodPost, "/api/v1/coach/feed"},
		{http.MethodDelete, "/api/v1/coach/feed/p1"},
		{http.MethodGet, "/api/v1/workout-templates/tpl-1"},
		{http.MethodDelete, "/api/v1/workout-templates/tpl-1"},
		{http.MethodGet, "/api/v1/coach/dashboard/summary"},
		{http.MethodGet, "/api/v1/coach/training/summary"},
		{http.MethodGet, "/api/v1/coach/athletes/a1/video-analytics"},
	}

	for _, tc := range coachOnlyRoutes {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		resp, err := app.Test(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode, "%s %s should forbid athlete role", tc.method, tc.path)
	}
}

func TestRoutes_RequireCoachIDOnTenantScopedCoachEndpoints(t *testing.T) {
	app := fiber.New()
	api := app.Group("/api/v1", func(c *fiber.Ctx) error {
		// Authenticated as coach but intentionally missing middleware.CoachIDKey.
		middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-no-tenant", Role: "coach"})
		return c.Next()
	})

	RegisterTrainingRoutes(api, handlers.NewTrainingHandler(nil), nil)
	RegisterAnalyticsRoutes(api, handlers.NewAnalyticsHandler(nil, nil, nil))

	requireCoachIDRoutes := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/coach/dashboard/summary"},
		{http.MethodGet, "/api/v1/coach/training/summary"},
		{http.MethodGet, "/api/v1/coach/athletes/a1/video-analytics"},
		{http.MethodDelete, "/api/v1/workout-templates/tpl-1"},
	}

	for _, tc := range requireCoachIDRoutes {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		resp, err := app.Test(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode, "%s %s should require CoachIDKey", tc.method, tc.path)
	}
}

