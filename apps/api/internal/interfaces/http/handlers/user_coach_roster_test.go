package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

func TestUserHandler_GetAthletesByCoach_CrossCoachDenied(t *testing.T) {
	h := &UserHandler{service: nil}
	app := fiber.New()
	app.Get("/coaches/:id/athletes", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		return h.GetAthletesByCoach(c)
	})
	req := httptest.NewRequest("GET", "/coaches/coach-b/athletes", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}
