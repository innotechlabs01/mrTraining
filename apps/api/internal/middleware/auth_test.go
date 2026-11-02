package middleware_test

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// setupAuthTestApp creates a Fiber app with auth middleware for testing.
func setupAuthTestApp() *fiber.App {
	app := fiber.New()

	// Test endpoint that requires auth
	app.Use("/protected", middleware.RequireAuth("sk_test_fake_key"))

	app.Get("/protected", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"user_id":  middleware.GetUserID(c),
			"user_email": middleware.GetUserEmail(c),
			"user_role": middleware.GetUserRole(c),
		})
	})

	return app
}

// TestRequireAuth_MissingHeader verifies 401 when Authorization header is missing.
func TestRequireAuth_MissingHeader(t *testing.T) {
	app := setupAuthTestApp()

	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	if len(body) == 0 {
		t.Error("expected non-empty error response body")
	}
}

// TestRequireAuth_InvalidFormat verifies 401 when Authorization header lacks Bearer prefix.
func TestRequireAuth_InvalidFormat(t *testing.T) {
	app := setupAuthTestApp()

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Token some-token-here")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp.StatusCode)
	}
}

// TestRequireAuth_EmptyBearer verifies 401 when Bearer token is empty.
func TestRequireAuth_EmptyBearer(t *testing.T) {
	app := setupAuthTestApp()

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer ")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	// Should fail JWT verification since token is empty
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp.StatusCode)
	}
}

// TestRequireAuth_InvalidToken verifies 401 when token is not a valid JWT.
func TestRequireAuth_InvalidToken(t *testing.T) {
	app := setupAuthTestApp()

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer not-a-real-jwt-token")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp.StatusCode)
	}
}

// TestGetUserID_NotSet verifies GetUserID returns empty string when not set.
func TestGetUserID_NotSet(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		userID := middleware.GetUserID(c)
		if userID != "" {
			t.Errorf("expected empty user ID, got '%s'", userID)
		}
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	_, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
}

// TestGetUserEmail_NotSet verifies GetUserEmail returns empty string when not set.
func TestGetUserEmail_NotSet(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		email := middleware.GetUserEmail(c)
		if email != "" {
			t.Errorf("expected empty email, got '%s'", email)
		}
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	_, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
}

// TestGetUserRole_NotSet verifies GetUserRole returns empty string when not set.
func TestGetUserRole_NotSet(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		role := middleware.GetUserRole(c)
		if role != "" {
			t.Errorf("expected empty role, got '%s'", role)
		}
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	_, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
}

// TestGetSessionClaims_NotSet verifies GetSessionClaims returns nil when not set.
func TestGetSessionClaims_NotSet(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		claims := middleware.GetSessionClaims(c)
		if claims != nil {
			t.Error("expected nil session claims")
		}
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	_, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
}
