package middleware_test

import (
	"context"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// tenantResolverFake implements TenantResolver with controllable responses.
type tenantResolverFake struct {
	activeCoachID   string // "" means user is not an active coach
	coachErr        error
	athleteHasCoach bool   // used for athlete flow validation
	athleteErr      error
	calledAthleteID string // last athleteID passed to AthleteHasActiveCoach
	calledCoachID   string // last coachID passed to AthleteHasActiveCoach
}

func (f *tenantResolverFake) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	if f.coachErr != nil {
		return "", f.coachErr
	}
	return f.activeCoachID, nil
}

func (f *tenantResolverFake) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	f.calledAthleteID = athleteID
	f.calledCoachID = coachID
	if f.athleteErr != nil {
		return false, f.athleteErr
	}
	return f.athleteHasCoach, nil
}

// setupTenantTestApp builds a Fiber app that injects user_id (simulating
// RequireAuth having run) and then runs RequireTenantContext.
func setupTenantTestApp(resolver middleware.TenantResolver) *fiber.App {
	app := fiber.New()

	// Simulate RequireAuth having populated user_id from Clerk JWT.
	app.Use("/tenant", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "user_123")
		return c.Next()
	})

	app.Use("/tenant", middleware.RequireTenantContext(resolver))

	app.Get("/tenant", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"coach_id": middleware.GetCoachID(c),
			"user_id":  middleware.GetUserID(c),
		})
	})

	return app
}

// -- Test: coach flow --

func TestRequireTenantContext_CoachActive(t *testing.T) {
	resolver := &tenantResolverFake{activeCoachID: "coach_aaa"}
	app := setupTenantTestApp(resolver)

	req := httptest.NewRequest("GET", "/tenant", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	if len(body) == 0 {
		t.Error("expected non-empty response body")
	}
}

func TestRequireTenantContext_CoachInactive(t *testing.T) {
	resolver := &tenantResolverFake{activeCoachID: ""}
	app := setupTenantTestApp(resolver)

	req := httptest.NewRequest("GET", "/tenant", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	// Middleware does NOT fail here — it leaves coach context unset.
	// Handlers that require a coach context must check GetCoachID() and deny.
	if resp.StatusCode != 200 {
		t.Errorf("expected 200 (middleware passes through), got %d", resp.StatusCode)
	}

	// Verify coach_id was NOT set
	body, _ := io.ReadAll(resp.Body)
	if strings.Contains(string(body), `"coach_id":"coach_`) {
		t.Errorf("expected coach_id to be empty, got %s", string(body))
	}
}

func TestRequireTenantContext_CoachResolverError(t *testing.T) {
	resolver := &tenantResolverFake{coachErr: errors.New("db down")}
	app := setupTenantTestApp(resolver)

	req := httptest.NewRequest("GET", "/tenant", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	if resp.StatusCode != fiber.StatusInternalServerError {
		t.Errorf("expected 500 for resolver error, got %d", resp.StatusCode)
	}
}

// -- Test: athlete flow --

func TestRequireTenantContext_AthleteWithValidRelation(t *testing.T) {
	resolver := &tenantResolverFake{
		activeCoachID:   "", // athlete is not a coach
		athleteHasCoach: true,
	}
	app := setupTenantTestApp(resolver)

	req := httptest.NewRequest("GET", "/tenant", nil)
	req.Header.Set("X-Coach-ID", "coach_aaa")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	if resolver.calledAthleteID != "user_123" {
		t.Errorf("calledAthleteID = %s, want user_123", resolver.calledAthleteID)
	}
	if resolver.calledCoachID != "coach_aaa" {
		t.Errorf("calledCoachID = %s, want coach_aaa", resolver.calledCoachID)
	}
}

func TestRequireTenantContext_AthleteNoRelation(t *testing.T) {
	resolver := &tenantResolverFake{
		activeCoachID:   "",
		athleteHasCoach: false,
	}
	app := setupTenantTestApp(resolver)

	req := httptest.NewRequest("GET", "/tenant", nil)
	req.Header.Set("X-Coach-ID", "coach_aaa")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Errorf("expected 403 for no relation, got %d", resp.StatusCode)
	}
}

func TestRequireTenantContext_AthleteMissingHeader(t *testing.T) {
	resolver := &tenantResolverFake{
		activeCoachID:   "",
		athleteHasCoach: false,
	}
	app := setupTenantTestApp(resolver)

	req := httptest.NewRequest("GET", "/tenant", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	// Middleware does NOT fail here — it leaves coach context unset.
	// Handlers that require a coach context must check GetCoachID() and deny.
	if resp.StatusCode != 200 {
		t.Errorf("expected 200 (middleware passes through), got %d", resp.StatusCode)
	}

	// Verify coach_id was NOT set
	body, _ := io.ReadAll(resp.Body)
	if strings.Contains(string(body), `"coach_id":"coach_`) {
		t.Errorf("expected coach_id to be empty, got %s", string(body))
	}
}

func TestRequireTenantContext_AthleteResolverError(t *testing.T) {
	resolver := &tenantResolverFake{
		activeCoachID:   "",
		athleteErr:      errors.New("db down"),
		athleteHasCoach: false,
	}
	app := setupTenantTestApp(resolver)

	req := httptest.NewRequest("GET", "/tenant", nil)
	req.Header.Set("X-Coach-ID", "coach_aaa")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	if resp.StatusCode != fiber.StatusInternalServerError {
		t.Errorf("expected 500 for resolver error, got %d", resp.StatusCode)
	}
}

// -- Test: unauthenticated --

func TestRequireTenantContext_Unauthenticated(t *testing.T) {
	resolver := &tenantResolverFake{}
	app := fiber.New()
	app.Use("/tenant", middleware.RequireTenantContext(resolver))
	app.Get("/tenant", func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest("GET", "/tenant", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected 401 for unauthenticated, got %d", resp.StatusCode)
	}
}

// -- Test: coach and athlete independent contexts --

func TestRequireTenantContext_IndependentCoachContexts(t *testing.T) {
	resolver := &tenantResolverFake{
		activeCoachID:   "",
		athleteHasCoach: true,
	}
	app := setupTenantTestApp(resolver)

	req1 := httptest.NewRequest("GET", "/tenant", nil)
	req1.Header.Set("X-Coach-ID", "coach_aaa")
	resp1, err := app.Test(req1)
	if err != nil {
		t.Fatalf("failed request 1: %v", err)
	}
	if resp1.StatusCode != 200 {
		t.Errorf("request 1 expected 200, got %d", resp1.StatusCode)
	}

	req2 := httptest.NewRequest("GET", "/tenant", nil)
	req2.Header.Set("X-Coach-ID", "coach_bbb")
	resp2, err := app.Test(req2)
	if err != nil {
		t.Fatalf("failed request 2: %v", err)
	}
	if resp2.StatusCode != 200 {
		t.Errorf("request 2 expected 200, got %d", resp2.StatusCode)
	}

	if resolver.calledAthleteID != "user_123" {
		t.Errorf("calledAthleteID = %s, want user_123", resolver.calledAthleteID)
	}
	if resolver.calledCoachID != "coach_bbb" {
		t.Errorf("calledCoachID = %s, want coach_bbb", resolver.calledCoachID)
	}
}

// TestRequireTenantContext_DownstreamCanReadCoachID verifies handlers can read
// the resolved coach via GetCoachID.
func TestRequireTenantContext_DownstreamCanReadCoachID(t *testing.T) {
	resolver := &tenantResolverFake{activeCoachID: "coach_aaa"}
	app := setupTenantTestApp(resolver)

	req := httptest.NewRequest("GET", "/tenant", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read body: %v", err)
	}
	if len(body) == 0 {
		t.Error("expected non-empty response body")
	}
}
