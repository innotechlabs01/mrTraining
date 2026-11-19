package handlers

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type runningTenantDeny struct{}

func (runningTenantDeny) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	return userID, nil
}
func (runningTenantDeny) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return false, nil
}

func TestRunningCoachSessions_CrossCoachDenied(t *testing.T) {
	h := &RunningHandler{
		service:        nil,
		tenantResolver: runningTenantDeny{},
	}

	app := fiber.New()
	app.Get("/coach/athletes/:id/running/sessions", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		return h.CoachListSessionsByAthlete(c)
	})

	req := httptest.NewRequest("GET", "/coach/athletes/athlete-1/running/sessions", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}

func TestRunningCoachSessions_StatsCrossCoachDenied(t *testing.T) {
	h := &RunningHandler{
		service:        nil,
		tenantResolver: runningTenantDeny{},
	}
	app := fiber.New()
	app.Get("/coach/athletes/:id/running/stats", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		return h.CoachGetStatsByAthlete(c)
	})
	req := httptest.NewRequest("GET", "/coach/athletes/athlete-1/running/stats", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}

func TestRunningCoachSessions_TrendCrossCoachDenied(t *testing.T) {
	h := &RunningHandler{
		service:        nil,
		tenantResolver: runningTenantDeny{},
	}
	app := fiber.New()
	app.Get("/coach/athletes/:id/running/weekly-trend", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		return h.CoachGetWeeklyTrendByAthlete(c)
	})
	req := httptest.NewRequest("GET", "/coach/athletes/athlete-1/running/weekly-trend", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}

func TestRunningCoachSessions_ExportCrossCoachDenied(t *testing.T) {
	h := &RunningHandler{
		service:        nil,
		tenantResolver: runningTenantDeny{},
	}
	app := fiber.New()
	app.Get("/coach/athletes/:id/running/export", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		return h.CoachExportSessionsByAthlete(c)
	})
	req := httptest.NewRequest("GET", "/coach/athletes/athlete-1/running/export?format=csv", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}
