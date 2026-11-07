package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
)

func TestRequireAlly(t *testing.T) {
	newApp := func(role string) *fiber.App {
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			c.Locals(string(UserRoleKey), role)
			return c.Next()
		})
		app.Use(RequireAlly())
		app.Get("/ok", func(c *fiber.Ctx) error {
			return c.SendStatus(http.StatusOK)
		})
		return app
	}

	// Ally is allowed.
	resp, err := newApp("ally").Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	// Admin and super_admin are also allowed.
	resp, err = newApp("admin").Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	resp, err = newApp("super_admin").Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	// Coach, athlete and unauthenticated are forbidden.
	for _, role := range []string{"coach", "athlete", ""} {
		resp, err := newApp(role).Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode, "role %q should be forbidden", role)
	}
}

func TestRequirePlatformSuperAdmin(t *testing.T) {
	newApp := func(userID string, allowed ...interface{}) *fiber.App {
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			c.Locals(string(UserIDKey), userID)
			return c.Next()
		})
		app.Use(RequirePlatformSuperAdmin(allowed...))
		app.Get("/ok", func(c *fiber.Ctx) error {
			return c.SendStatus(http.StatusOK)
		})
		return app
	}

	// Identity allowlist: configured Clerk ID is allowed.
	resp, err := newApp("user_ok", "user_ok").Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	// A comma-separated env-style allowlist is normalized.
	resp, err = newApp("user_ok", "other, user_ok").Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	// A non-allowed identity is denied even when its application role is super_admin.
	resp, err = newApp("user_other", "user_ok").Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, resp.StatusCode)

	// Empty allowlist fails closed (no role escalation path).
	resp, err = newApp("user_ok").Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, resp.StatusCode)

	// Missing/empty authenticated identity is unauthorized.
	resp, err = newApp("", "user_ok").Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestRequirePlatformSuperAdminAuthMatrix(t *testing.T) {
	allowedID := "allowed-admin"
	cases := []struct {
		name   string
		cfg    *TestAuthConfig
		allowed []interface{}
		want   int
	}{
		{name: "anonymous", cfg: nil, allowed: []interface{}{allowedID}, want: http.StatusUnauthorized},
		{name: "athlete", cfg: &TestAuthConfig{UserID: "athlete-1", Role: "athlete"}, allowed: []interface{}{allowedID}, want: http.StatusForbidden},
		{name: "coach", cfg: &TestAuthConfig{UserID: "coach-1", Role: "coach"}, allowed: []interface{}{allowedID}, want: http.StatusForbidden},
		{name: "unknown", cfg: &TestAuthConfig{UserID: "unknown-user", Role: "unknown"}, allowed: []interface{}{allowedID}, want: http.StatusForbidden},
		{name: "allowed", cfg: &TestAuthConfig{UserID: allowedID, Role: "athlete"}, allowed: []interface{}{allowedID}, want: http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				if tc.cfg != nil {
					SetTestAuth(c, *tc.cfg)
				}
				return c.Next()
			})
			app.Use(RequirePlatformSuperAdmin(tc.allowed...))
			app.Get("/ok", func(c *fiber.Ctx) error {
				return c.SendStatus(http.StatusOK)
			})

			req := httptest.NewRequest(http.MethodGet, "/ok", nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			require.Equal(t, tc.want, resp.StatusCode)
		})
	}
}
