package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	"github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

func setupRunningSessionFixture(t *testing.T) (*fiber.App, string) {
	t.Helper()
	repo := newMockRunningRepository()
	svc := runningapp.NewService(repo, nil)

	sessionID := "session-1"
	repo.sessions[sessionID] = &running.RunningSession{
		ID:     sessionID,
		UserID: "athlete-owner",
		Date:   "2026-01-01",
		Source: "manual",
	}

	app := fiber.New()
	handler := NewRunningHandler(svc, nil)
	app.Get("/running/sessions/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "athlete-other")
		return handler.GetSession(c)
	})
	app.Patch("/running/sessions/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "athlete-other")
		return handler.UpdateSession(c)
	})
	app.Delete("/running/sessions/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "athlete-other")
		return handler.DeleteSession(c)
	})
	return app, sessionID
}

func TestRunningSessionCrossOwnerDenied(t *testing.T) {
	app, sid := setupRunningSessionFixture(t)
	for _, method := range []string{http.MethodGet, http.MethodPatch, http.MethodDelete} {
		req := httptest.NewRequest(method, "/running/sessions/"+sid, nil)
		if method == http.MethodPatch {
			b, _ := json.Marshal(map[string]float64{"distance": 5})
			req = httptest.NewRequest(method, "/running/sessions/"+sid, bytes.NewReader(b))
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != fiber.StatusForbidden {
			t.Fatalf("%s expected 403, got %d", method, resp.StatusCode)
		}
	}
}
