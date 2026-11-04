package handlers

import (
	"net/http/httptest"
	"testing"

	"context"
	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type analyticsTenantDeny struct{}

func (analyticsTenantDeny) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	return userID, nil
}
func (analyticsTenantDeny) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return false, nil
}

func TestAnalyticsAthleteEndpoints_CrossCoachDenied(t *testing.T) {
	h := &AnalyticsHandler{
		service:        nil,
		db:             nil,
		tenantResolver: analyticsTenantDeny{},
	}
	app := fiber.New()
	app.Get("/athlete/:athleteId/analytics/hr-zones", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		return h.GetHRZones(c)
	})
	req := httptest.NewRequest("GET", "/athlete/athlete-b/analytics/hr-zones", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}
