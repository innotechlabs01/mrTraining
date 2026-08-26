package middleware_test

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// setupRBACTestApp creates a Fiber app with role-setting middleware for testing.
// It uses a custom middleware to inject a role into context before RequireRole checks.
func setupRBACTestApp(role string) *fiber.App {
	app := fiber.New()

	// Middleware to simulate auth and set role
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserRoleKey), role)
		return c.Next()
	})

	return app
}

// TestRequireRole_MatchingRole verifies request passes when user role matches.
func TestRequireRole_MatchingRole(t *testing.T) {
	app := setupRBACTestApp("coach")

	app.Get("/test", middleware.RequireRole("coach", "admin"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

// TestRequireRole_NoMatchingRole verifies 403 when user role doesn't match.
func TestRequireRole_NoMatchingRole(t *testing.T) {
	app := setupRBACTestApp("athlete")

	app.Get("/test", middleware.RequireRole("coach", "admin"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusForbidden {
		t.Errorf("expected status 403, got %d", resp.StatusCode)
	}
}

// TestRequireRole_EmptyRole verifies 403 when user has no role set.
func TestRequireRole_EmptyRole(t *testing.T) {
	app := setupRBACTestApp("")

	app.Get("/test", middleware.RequireRole("coach"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusForbidden {
		t.Errorf("expected status 403, got %d", resp.StatusCode)
	}
}

// TestRequireCoach_AllowedRoles verifies coach middleware allows coach, admin, super_admin.
func TestRequireCoach_AllowedRoles(t *testing.T) {
	tests := []struct {
		name     string
		role     string
		expected int
	}{
		{"coach allowed", "coach", fiber.StatusOK},
		{"admin allowed", "admin", fiber.StatusOK},
		{"super_admin allowed", "super_admin", fiber.StatusOK},
		{"athlete denied", "athlete", fiber.StatusForbidden},
		{"empty role denied", "", fiber.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := setupRBACTestApp(tt.role)
			app.Get("/test", middleware.RequireCoach(), func(c *fiber.Ctx) error {
				return c.SendStatus(fiber.StatusOK)
			})

			req := httptest.NewRequest("GET", "/test", nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("failed to execute request: %v", err)
			}

			if resp.StatusCode != tt.expected {
				t.Errorf("expected status %d, got %d", tt.expected, resp.StatusCode)
			}
		})
	}
}

// TestRequireAthlete_AllowedRoles verifies athlete middleware allows athlete, admin, super_admin.
func TestRequireAthlete_AllowedRoles(t *testing.T) {
	tests := []struct {
		name     string
		role     string
		expected int
	}{
		{"athlete allowed", "athlete", fiber.StatusOK},
		{"admin allowed", "admin", fiber.StatusOK},
		{"super_admin allowed", "super_admin", fiber.StatusOK},
		{"coach denied", "coach", fiber.StatusForbidden},
		{"empty role denied", "", fiber.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := setupRBACTestApp(tt.role)
			app.Get("/test", middleware.RequireAthlete(), func(c *fiber.Ctx) error {
				return c.SendStatus(fiber.StatusOK)
			})

			req := httptest.NewRequest("GET", "/test", nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("failed to execute request: %v", err)
			}

			if resp.StatusCode != tt.expected {
				t.Errorf("expected status %d, got %d", tt.expected, resp.StatusCode)
			}
		})
	}
}

// TestRequireAdmin_AllowedRoles verifies admin middleware allows admin and super_admin only.
func TestRequireAdmin_AllowedRoles(t *testing.T) {
	tests := []struct {
		name     string
		role     string
		expected int
	}{
		{"admin allowed", "admin", fiber.StatusOK},
		{"super_admin allowed", "super_admin", fiber.StatusOK},
		{"coach denied", "coach", fiber.StatusForbidden},
		{"athlete denied", "athlete", fiber.StatusForbidden},
		{"empty role denied", "", fiber.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := setupRBACTestApp(tt.role)
			app.Get("/test", middleware.RequireAdmin(), func(c *fiber.Ctx) error {
				return c.SendStatus(fiber.StatusOK)
			})

			req := httptest.NewRequest("GET", "/test", nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("failed to execute request: %v", err)
			}

			if resp.StatusCode != tt.expected {
				t.Errorf("expected status %d, got %d", tt.expected, resp.StatusCode)
			}
		})
	}
}

// TestRequireSuperAdmin_AllowedRoles verifies super_admin middleware allows only super_admin.
func TestRequireSuperAdmin_AllowedRoles(t *testing.T) {
	tests := []struct {
		name     string
		role     string
		expected int
	}{
		{"super_admin allowed", "super_admin", fiber.StatusOK},
		{"admin denied", "admin", fiber.StatusForbidden},
		{"coach denied", "coach", fiber.StatusForbidden},
		{"athlete denied", "athlete", fiber.StatusForbidden},
		{"empty role denied", "", fiber.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := setupRBACTestApp(tt.role)
			app.Get("/test", middleware.RequireSuperAdmin(), func(c *fiber.Ctx) error {
				return c.SendStatus(fiber.StatusOK)
			})

			req := httptest.NewRequest("GET", "/test", nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("failed to execute request: %v", err)
			}

			if resp.StatusCode != tt.expected {
				t.Errorf("expected status %d, got %d", tt.expected, resp.StatusCode)
			}
		})
	}
}
