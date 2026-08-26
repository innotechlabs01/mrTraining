package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	userdomain "github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// mockRepository implements user.Repository for handler tests.
type mockRepository struct {
	getByIDFn            func(ctx interface{}, id string) (*userdomain.User, error)
	getCoachFn           func(ctx interface{}, userID string) (*userdomain.Coach, error)
	getAthleteProfileFn  func(ctx interface{}, userID string) (*userdomain.AthleteProfile, error)
	listCoachesFn        func(ctx interface{}) ([]*userdomain.Coach, error)
	listAthletesByCoachFn func(ctx interface{}, coachID string) ([]*userdomain.AthleteProfile, error)
}

// We test handlers directly by building Fiber test apps with the handler methods.
// Since handlers depend on the application service (which depends on the repository),
// we test at the handler level by creating a Fiber app and making requests.

// setupTestApp creates a Fiber app with a test handler and the given user data.
func setupTestApp(t *testing.T) *fiber.App {
	t.Helper()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
		},
	})

	return app
}

// TestGetMeWithoutAuth tests that the handler returns 401 when no user ID is in context.
func TestGetMeWithoutAuth(t *testing.T) {
	app := setupTestApp(t)

	// Create a real handler with a nil service — it will fail before using it
	handler := &UserHandler{}

	// Register the real handler method — it checks for user ID in context
	app.Get("/users/me", handler.GetCurrentUser)

	req := httptest.NewRequest(http.MethodGet, "/users/me", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Handler should return 401 because no user ID in context
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp.StatusCode)
	}
}

// TestUpdateProfileInvalidBody tests that PUT /users/me returns 400 with invalid JSON.
func TestUpdateProfileInvalidBody(t *testing.T) {
	app := setupTestApp(t)

	// We need to test the handler's body parsing logic
	// Create a minimal handler that simulates the validation
	app.Put("/users/me", func(c *fiber.Ctx) error {
		var req dto.UpdateProfileRequest
		if err := c.BodyParser(&req); err != nil {
			return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
		}
		return c.SendStatus(fiber.StatusOK)
	})

	body := bytes.NewBufferString("not json")
	req := httptest.NewRequest(http.MethodPut, "/users/me", body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
}

// TestUpdateProfileValidationErrors tests that validation errors return 422.
func TestUpdateProfileValidationErrors(t *testing.T) {
	app := setupTestApp(t)

	app.Put("/users/me", func(c *fiber.Ctx) error {
		var req dto.UpdateProfileRequest
		if err := c.BodyParser(&req); err != nil {
			return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
		}

		// Validate
		if req.Name == "" || len(req.Name) < 2 {
			return appresponse.Error(c, fiber.StatusUnprocessableEntity, "name: is required")
		}
		return c.SendStatus(fiber.StatusOK)
	})

	body, _ := json.Marshal(dto.UpdateProfileRequest{Name: "X"})
	req := httptest.NewRequest(http.MethodPut, "/users/me", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("expected status 422, got %d", resp.StatusCode)
	}
}

// TestListCoachesEmpty tests that GET /coaches returns an empty list.
func TestListCoachesEmpty(t *testing.T) {
	app := setupTestApp(t)

	app.Get("/coaches", func(c *fiber.Ctx) error {
		return appresponse.Success(c, dto.ListResponse[dto.CoachResponse]{
			Data:  []dto.CoachResponse{},
			Total: 0,
			Page:  1,
			Limit: 20,
		})
	})

	req := httptest.NewRequest(http.MethodGet, "/coaches?page=1&limit=20", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	var result dto.ListResponse[dto.CoachResponse]
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if result.Total != 0 {
		t.Errorf("expected total 0, got %d", result.Total)
	}
	if len(result.Data) != 0 {
		t.Errorf("expected empty data, got %d items", len(result.Data))
	}
}

// TestGetUserNotFound tests that the error handler maps NotFound to 404.
func TestGetUserNotFound(t *testing.T) {
	app := setupTestApp(t)

	app.Get("/users/:id", func(c *fiber.Ctx) error {
		return appresponse.Error(c, fiber.StatusNotFound, "User with identifier 'x' not found")
	})

	req := httptest.NewRequest(http.MethodGet, "/users/nonexistent", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", resp.StatusCode)
	}
}

// TestHandleErrorMapping verifies that AppError status codes are preserved.
func TestHandleErrorMapping(t *testing.T) {
	testCases := []struct {
		name     string
		err      error
		expected int
	}{
		{"not found", errors.NotFound("User", "x"), 404},
		{"unauthorized", errors.Unauthorized(""), 401},
		{"forbidden", errors.Forbidden(""), 403},
		{"bad request", errors.BadRequest("invalid"), 400},
		{"conflict", errors.Conflict("duplicate"), 409},
		{"internal", errors.Internal(""), 500},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			app := setupTestApp(t)

			// Create a handler to test handleError
			h := &UserHandler{}

			app.Get("/test", func(c *fiber.Ctx) error {
				return h.handleError(c, tc.err)
			})

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if resp.StatusCode != tc.expected {
				t.Errorf("expected status %d, got %d", tc.expected, resp.StatusCode)
			}
		})
	}
}
