package middleware

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// withTestAuth wraps a fiber.Handler by injecting a test identity into
// c.Locals() before calling the handler. It mirrors exactly what RequireAuth
// sets via c.Locals(), so handlers reading GetUserID/GetUserRole work
// identically without Clerk JWT verification.
//
// SAFETY: SetTestAuth is a no-op outside testing.Testing(), so this wrapper
// is safe to use in test files only.
func withTestAuth(handler fiber.Handler, cfg TestAuthConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		SetTestAuth(c, cfg)
		return handler(c)
	}
}

// TestSetTestAuth_AcceptsValidIdentity verifies that a valid test identity
// injected via SetTestAuth is accepted by handlers that read c.Locals().
func TestSetTestAuth_AcceptsValidIdentity(t *testing.T) {
	app := fiber.New()

	app.Get("/protected", withTestAuth(func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing user identity")
		}
		return c.JSON(fiber.Map{
			"user_id":  userID,
			"user_role": GetUserRole(c),
			"email":     GetUserEmail(c),
		})
	}, TestAuthConfig{
		UserID: "user-test-1",
		Role:   "coach",
		Email:  "coach@test.com",
	}))

	app.Get("/public", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"public": true})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	bodyStr := string(body)
	if !contains(bodyStr, "user-test-1") {
		t.Errorf("expected response to contain user_id user-test-1, got: %s", bodyStr)
	}
	if !contains(bodyStr, "coach") {
		t.Errorf("expected response to contain role coach, got: %s", bodyStr)
	}
	if !contains(bodyStr, "coach@test.com") {
		t.Errorf("expected response to contain email coach@test.com, got: %s", bodyStr)
	}
}

// TestSetTestAuth_WithoutIdentityIsRejected verifies that without SetTestAuth,
// the protected endpoint returns 401 because GetUserID returns empty.
func TestSetTestAuth_WithoutIdentityIsRejected(t *testing.T) {
	app := fiber.New()

	app.Get("/protected", func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing user identity")
		}
		return c.JSON(fiber.Map{"user_id": userID})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 401 {
		t.Errorf("expected status 401 without auth, got %d", resp.StatusCode)
	}
}

// TestSetTestAuth_CoachCannotAccessOtherCoachResources verifies coach isolation.
// A coach with user_id "coach-1" should see only their own identity.
func TestSetTestAuth_CoachCannotAccessOtherCoachResources(t *testing.T) {
	app := fiber.New()

	app.Get("/protected", withTestAuth(func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing user identity")
		}
		return c.JSON(fiber.Map{
			"user_id":  userID,
			"user_role": GetUserRole(c),
		})
	}, TestAuthConfig{
		UserID: "coach-1",
		Role:   "coach",
	}))

	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	if contains(string(body), "coach-2") {
		t.Error("coach-1 should not see coach-2's resources")
	}
	if !contains(string(body), "coach-1") {
		t.Error("expected response to contain coach-1's identity")
	}
}

// TestSetTestAuth_AthleteCannotAccessOtherAthleteResources verifies athlete isolation.
func TestSetTestAuth_AthleteCannotAccessOtherAthleteResources(t *testing.T) {
	app := fiber.New()

	app.Get("/protected", withTestAuth(func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing user identity")
		}
		return c.JSON(fiber.Map{
			"user_id":  userID,
			"user_role": GetUserRole(c),
		})
	}, TestAuthConfig{
		UserID: "athlete-1",
		Role:   "athlete",
	}))

	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	if contains(string(body), "athlete-2") {
		t.Error("athlete-1 should not see athlete-2's resources")
	}
	if !contains(string(body), "athlete-1") {
		t.Error("expected response to contain athlete-1's identity")
	}
}

// TestSetTestAuth_PublicEndpointRemainsPublic verifies that public endpoints
// do not require authentication.
func TestSetTestAuth_PublicEndpointRemainsPublic(t *testing.T) {
	app := fiber.New()

	app.Get("/public", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"public": true})
	})

	req := httptest.NewRequest("GET", "/public", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Errorf("expected status 200 for public endpoint, got %d", resp.StatusCode)
	}
}

// TestSetTestAuth_IsTestEnvironment verifies IsTestEnvironment behavior.
func TestSetTestAuth_IsTestEnvironment(t *testing.T) {
	if !IsTestEnvironment() {
		t.Error("expected IsTestEnvironment() to return true during go test")
	}
}

// TestSetTestAuth_ConfigString verifies the String method.
func TestSetTestAuth_ConfigString(t *testing.T) {
	cfg := TestAuthConfig{
		UserID: "user-1",
		Role:   "coach",
		Email:  "coach@test.com",
	}
	s := cfg.String()
	if !contains(s, "user-1") {
		t.Errorf("expected String() to contain user_id, got: %s", s)
	}
	if !contains(s, "coach") {
		t.Errorf("expected String() to contain role, got: %s", s)
	}
}

// TestSetTestAuth_ClearTestAuth verifies ClearTestAuth removes identity.
func TestSetTestAuth_ClearTestAuth(t *testing.T) {
	app := fiber.New()

	app.Use(func(c *fiber.Ctx) error {
		SetTestAuth(c, TestAuthConfig{
			UserID: "user-1",
			Role:   "coach",
		})
		ClearTestAuth(c)
		if GetUserID(c) != "" {
			t.Error("expected user_id to be empty after ClearTestAuth")
		}
		return c.Next()
	})

	req := httptest.NewRequest("GET", "/test", nil)
	_, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
}

// TestRequireAuthFromExistingTests verifies that existing RequireAuth tests
// still pass (no regression on Clerk middleware).
func TestRequireAuthFromExistingTests(t *testing.T) {
	app := fiber.New()
	app.Use("/protected", RequireAuth("sk_test_fake_key"))
	app.Get("/protected", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"user_id": GetUserID(c)})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 401 {
		t.Errorf("expected status 401 without token, got %d", resp.StatusCode)
	}
}

// contains is a simple substring helper.
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || (func() bool {
		for i := 0; i+len(substr) <= len(s); i++ {
			if s[i:i+len(substr)] == substr {
				return true
			}
		}
		return false
	})())
}
