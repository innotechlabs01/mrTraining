package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	membershipapp "github.com/innotechlabs01/mr-training-api/internal/application/membership"
	memrep "github.com/innotechlabs01/mr-training-api/internal/infrastructure/memory"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type membershipTenantActive struct{}

func (membershipTenantActive) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	return userID, nil
}
func (membershipTenantActive) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return true, nil
}

type membershipTenantInactive struct{}

func (membershipTenantInactive) GetActiveCoachID(ctx context.Context, userID string) (string, error) {
	return userID, nil
}
func (membershipTenantInactive) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	return false, nil
}

func TestMembershipHandler_CreateOwnAllowed(t *testing.T) {
	svc := membershipapp.NewService(memrep.NewInMemoryMembershipRepository())
	h := NewMembershipHandler(svc, nil, nil, membershipTenantActive{})

	app := fiber.New()
	app.Post("/memberships", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.CreateMembership(c)
	})

	body, _ := json.Marshal(map[string]interface{}{"athlete_id": "athlete-1", "plan_name": "Plan", "plan_price": 10, "billing_period": "monthly"})
	req := httptest.NewRequest("POST", "/memberships", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestMembershipHandler_CreateCrossCoachDenied(t *testing.T) {
	svc := membershipapp.NewService(memrep.NewInMemoryMembershipRepository())
	h := NewMembershipHandler(svc, nil, nil, membershipTenantInactive{})

	app := fiber.New()
	app.Post("/memberships", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.CreateMembership(c)
	})

	body, _ := json.Marshal(map[string]interface{}{"athlete_id": "athlete-1", "plan_name": "Plan", "plan_price": 10, "billing_period": "monthly"})
	req := httptest.NewRequest("POST", "/memberships", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}
