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

type fakeAnalyticsHandlerRepoFull struct{}

func (fakeAnalyticsHandlerRepoFull) GetDashboardSummary(ctx context.Context, coachID string) (*analyticsdomain.DashboardSummary, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetHRZones(ctx context.Context, athleteID string) ([]analyticsdomain.HRZone, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetFatigueMap(ctx context.Context, athleteID string) ([]analyticsdomain.FatigueMap, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetOneRM(ctx context.Context, athleteID string) ([]analyticsdomain.OneRM, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetTrainingSummary(ctx context.Context, coachID string) (*analyticsdomain.TrainingSummary, error) {
	return nil, nil
}
func (fakeAnalyticsHandlerRepoFull) GetEffort(ctx context.Context, athleteID string) ([]analyticsdomain.Effort, error) {
	return nil, nil
}

type analyticsCrossTenantDeny struct{}

func (analyticsCrossTenantDeny) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	return userID, nil
}
func (analyticsCrossTenantDeny) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return false, nil
}

func makeAnalyticsHandler(repo analyticsdomain.Repository, resolver middleware.TenantResolver) *AnalyticsHandler {
	return &AnalyticsHandler{service: analyticsapp.NewService(repo), db: nil, tenantResolver: resolver}
}

func TestAnalyticsAthleteSelfAllowed(t *testing.T) {
	h := makeAnalyticsHandler(fakeAnalyticsHandlerRepoFull{}, analyticsCrossTenantDeny{})
	for _, ep := range []struct{ name, path string }{
		{"HRZones", "/athlete/alice/analytics/hr-zones"},
		{"FatigueMap", "/athlete/alice/analytics/fatigue-map"},
		{"OneRM", "/athlete/alice/analytics/one-rm"},
		{"Effort", "/athlete/alice/analytics/effort"},
	} {
		t.Run(ep.name, func(t *testing.T) {
			app := fiber.New()
			route := "/athlete/:athleteId/analytics/hr-zones"
			if ep.name == "FatigueMap" { route = "/athlete/:athleteId/analytics/fatigue-map" }
			if ep.name == "OneRM" { route = "/athlete/:athleteId/analytics/one-rm" }
			if ep.name == "Effort" { route = "/athlete/:athleteId/analytics/effort" }
			app.Get(route, func(c *fiber.Ctx) error {
				c.Locals(string(middleware.UserIDKey), "alice")
				switch ep.name {
				case "HRZones":
					return h.GetHRZones(c)
				case "FatigueMap":
					return h.GetFatigueMap(c)
				case "OneRM":
					return h.GetOneRM(c)
				case "Effort":
					return h.GetEffort(c)
				}
				return nil
			})
			resp, err := app.Test(httptest.NewRequest("GET", ep.path, nil))
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != fiber.StatusOK {
				t.Fatalf("%s self expected 200, got %d", ep.name, resp.StatusCode)
			}
		})
	}
}

func TestAnalyticsAthleteCrossDenied(t *testing.T) {
	h := makeAnalyticsHandler(fakeAnalyticsHandlerRepoFull{}, analyticsCrossTenantDeny{})
	for _, ep := range []struct{ name, path string }{
		{"HRZones", "/athlete/bob/analytics/hr-zones"},
		{"FatigueMap", "/athlete/bob/analytics/fatigue-map"},
		{"OneRM", "/athlete/bob/analytics/one-rm"},
		{"Effort", "/athlete/bob/analytics/effort"},
	} {
		t.Run(ep.name, func(t *testing.T) {
			app := fiber.New()
			route := "/athlete/:athleteId/analytics/hr-zones"
			if ep.name == "FatigueMap" { route = "/athlete/:athleteId/analytics/fatigue-map" }
			if ep.name == "OneRM" { route = "/athlete/:athleteId/analytics/one-rm" }
			if ep.name == "Effort" { route = "/athlete/:athleteId/analytics/effort" }
			app.Get(route, func(c *fiber.Ctx) error {
				c.Locals(string(middleware.UserIDKey), "coach-a")
				switch ep.name {
				case "HRZones":
					return h.GetHRZones(c)
				case "FatigueMap":
					return h.GetFatigueMap(c)
				case "OneRM":
					return h.GetOneRM(c)
				case "Effort":
					return h.GetEffort(c)
				}
				return nil
			})
			resp, err := app.Test(httptest.NewRequest("GET", ep.path, nil))
			if err != nil {
				t.Fatal(err)
			}
			t.Logf("%s STATUS=%d", ep.name, resp.StatusCode)
			if resp.StatusCode != fiber.StatusForbidden {
				t.Fatalf("%s cross expected 403, got %d", ep.name, resp.StatusCode)
			}
		})
	}
}
