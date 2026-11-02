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
