package handlers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

func TestAdminHandler_AuthorizationMatrix(t *testing.T) {
	allowedID := "allowed-admin"
	h := NewAdminHandler(nil, nil)

	cases := []struct {
		name   string
		cfg    *middleware.TestAuthConfig
		want   int
	}{
		{name: "anonymous", cfg: nil, want: http.StatusUnauthorized},
		{name: "athlete", cfg: &middleware.TestAuthConfig{UserID: "athlete-1", Role: "athlete"}, want: http.StatusForbidden},
		{name: "coach", cfg: &middleware.TestAuthConfig{UserID: "coach-1", Role: "coach"}, want: http.StatusForbidden},
		{name: "unknown", cfg: &middleware.TestAuthConfig{UserID: "unknown-user", Role: "unknown"}, want: http.StatusForbidden},
		{name: "allowed", cfg: &middleware.TestAuthConfig{UserID: allowedID, Role: "athlete"}, want: http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				if tc.cfg != nil {
					middleware.SetTestAuth(c, *tc.cfg)
				}
				return c.Next()
			})
			app.Use(middleware.RequirePlatformSuperAdmin(allowedID))
			app.Get("/admin/dashboard", h.GetDashboard)

			req := httptest.NewRequest(http.MethodGet, "/admin/dashboard", nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			require.Equal(t, tc.want, resp.StatusCode, "case %s", tc.name)
		})
	}
}

func TestAdminHandler_UnauthorizedMatrixAllEndpoints(t *testing.T) {
	h := NewAdminHandler(nil, nil)
	allowedID := "allowed-admin"
	endpoints := []string{
		"/admin/dashboard",
		"/admin/coaches",
		"/admin/services/health",
	}
	for _, ep := range endpoints {
		t.Run(fmt.Sprintf("anonymous_%s", ep), func(t *testing.T) {
			app := fiber.New()
			app.Use(middleware.RequirePlatformSuperAdmin(allowedID))
			switch ep {
			case "/admin/dashboard":
				app.Get(ep, h.GetDashboard)
			case "/admin/coaches":
				app.Get(ep, h.ListCoaches)
			case "/admin/services/health":
				app.Get(ep, h.GetServicesHealth)
			}
			req := httptest.NewRequest(http.MethodGet, ep, nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		})
		t.Run(fmt.Sprintf("forbidden_%s", ep), func(t *testing.T) {
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-1", Role: "coach"})
				return c.Next()
			})
			app.Use(middleware.RequirePlatformSuperAdmin(allowedID))
			switch ep {
			case "/admin/dashboard":
				app.Get(ep, h.GetDashboard)
			case "/admin/coaches":
				app.Get(ep, h.ListCoaches)
			case "/admin/services/health":
				app.Get(ep, h.GetServicesHealth)
			}
			req := httptest.NewRequest(http.MethodGet, ep, nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusForbidden, resp.StatusCode)
		})
	}
}