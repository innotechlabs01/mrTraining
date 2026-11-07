package handlers_test

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	membershipapp "github.com/innotechlabs01/mr-training-api/internal/application/membership"
	domainmembership "github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type fakeRepoStatus struct {
	pastDue bool
}

func (f fakeRepoStatus) GetByAthleteID(ctx context.Context, athleteID string) (*domainmembership.Membership, error) {
	if f.pastDue {
		return &domainmembership.Membership{
			ID:                 "mem-1",
			AthleteID:          athleteID,
			CoachID:            "coach-1",
			PlanName:           "Plan",
			PlanPrice:          100000,
			BillingPeriod:      "monthly",
			Status:             "active",
			CurrentPeriodStart: "2026-10-01",
			CurrentPeriodEnd:   "2026-10-31",
			PaymentDueDate:     "2026-11-10",
		}, nil
	}
	return &domainmembership.Membership{
		ID:                 "mem-1",
		AthleteID:          athleteID,
		CoachID:            "coach-1",
		PlanName:           "Plan",
		PlanPrice:          100000,
		BillingPeriod:      "monthly",
		Status:             "active",
		CurrentPeriodStart: "2026-11-01",
		CurrentPeriodEnd:   "2026-12-31",
		PaymentDueDate:     "2027-01-05",
	}, nil
}
func (fakeRepoStatus) GetByID(ctx context.Context, id string) (*domainmembership.Membership, error) { return nil, nil }
func (fakeRepoStatus) GetPaymentByExternalID(ctx context.Context, externalID string) (*domainmembership.Payment, error) {
	return nil, nil
}
func (fakeRepoStatus) RecordMembershipSale(ctx context.Context, saleID string, m *domainmembership.Membership) error {
	return nil
}
func (fakeRepoStatus) Create(ctx context.Context, m *domainmembership.Membership) error { return nil }
func (fakeRepoStatus) Update(ctx context.Context, m *domainmembership.Membership) error { return nil }
func (fakeRepoStatus) Cancel(ctx context.Context, id string) error                     { return nil }
func (fakeRepoStatus) ListByCoach(ctx context.Context, coachID string) ([]*domainmembership.Membership, error) {
	return nil, nil
}
func (fakeRepoStatus) GetPaymentHistory(ctx context.Context, athleteID string) ([]*domainmembership.Payment, error) {
	return nil, nil
}
func (fakeRepoStatus) RecordPayment(ctx context.Context, p *domainmembership.Payment) error {
	return nil
}

func newTestMembershipStatusApp(t *testing.T, pastDue bool) *fiber.App {
	t.Helper()
	svc := membershipapp.NewService(fakeRepoStatus{pastDue: pastDue})
	h := handlers.NewMembershipHandler(svc, nil, nil, nil)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "athlete-"+uuid.NewString())
		return c.Next()
	})
	app.Get("/athletes/membership/status", h.GetMembershipStatus)
	return app
}

func TestGetMembershipStatus_PastDue_IsInGracePeriod(t *testing.T) {
	app := newTestMembershipStatusApp(t, true)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		HasActiveMembership bool   `json:"hasActiveMembership"`
		Status              string `json:"status"`
		IsInGracePeriod     bool   `json:"isInGracePeriod"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.True(t, body.HasActiveMembership)
	require.Equal(t, "past_due", body.Status)
	require.True(t, body.IsInGracePeriod)
}

func TestGetMembershipStatus_Active_NotInGracePeriod(t *testing.T) {
	app := newTestMembershipStatusApp(t, false)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		HasActiveMembership bool   `json:"hasActiveMembership"`
		Status              string `json:"status"`
		IsInGracePeriod     bool   `json:"isInGracePeriod"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.True(t, body.HasActiveMembership)
	require.Equal(t, "active", body.Status)
	require.False(t, body.IsInGracePeriod)
}