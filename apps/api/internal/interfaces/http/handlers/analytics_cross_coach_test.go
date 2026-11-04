package handlers

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	analyticsapp "github.com/innotechlabs01/mr-training-api/internal/application/analytics"
	analyticsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/analytics"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type fakeAnalyticsHandlerRepo struct{}

func (fakeAnalyticsHandlerRepo) GetDashboardSummary(ctx context.Context, coachID string) (*analyticsdomain.DashboardSummary, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepo) GetHRZones(ctx context.Context, athleteID string) ([]analyticsdomain.HRZone, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepo) GetFatigueMap(ctx context.Context, athleteID string) ([]analyticsdomain.FatigueMap, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepo) GetOneRM(ctx context.Context, athleteID string) ([]analyticsdomain.OneRM, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepo) GetTrainingSummary(ctx context.Context, coachID string) (*analyticsdomain.TrainingSummary, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepo) GetEffort(ctx context.Context, athleteID string) ([]analyticsdomain.Effort, error) {
	return nil, nil
}

type analyticsTenantDeny struct{}

func (analyticsTenantDeny) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	return userID, nil
}
func (analyticsTenantDeny) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return false, nil
}

func TestAnalyticsAthleteEndpoints_CrossCoachDenied(t *testing.T) {
	svc := analyticsapp.NewService(fakeAnalyticsHandlerRepo{})
	h := &AnalyticsHandler{service: svc, db: nil, tenantResolver: analyticsTenantDeny{}}

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

func TestAnalyticsAthleteEndpoints_SelfAllowed(t *testing.T) {
	svc := analyticsapp.NewService(fakeAnalyticsHandlerRepo{})
	h := &AnalyticsHandler{service: svc, db: nil, tenantResolver: analyticsTenantDeny{}}

	app := fiber.New()
	app.Get("/athlete/:athleteId/analytics/hr-zones", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "athlete-a")
		return h.GetHRZones(c)
	})
	req := httptest.NewRequest("GET", "/athlete/athlete-a/analytics/hr-zones", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}
