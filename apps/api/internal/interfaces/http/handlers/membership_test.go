package handlers_test

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	domainmembership "github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	membershipapp "github.com/innotechlabs01/mr-training-api/internal/application/membership"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// fakeRepoNotFound returns errors.NotFound from GetByAthleteID, mirroring the
// real Turso repository's behavior when no membership exists.
type fakeRepoNotFound struct{}

func (fakeRepoNotFound) GetByAthleteID(ctx context.Context, athleteID string) (*domainmembership.Membership, error) {
	return nil, errors.NotFound("Membership", athleteID)
}
func (fakeRepoNotFound) GetByID(ctx context.Context, id string) (*domainmembership.Membership, error) { return nil, nil }
func (fakeRepoNotFound) GetPaymentByExternalID(ctx context.Context, externalID string) (*domainmembership.Payment, error) {
	return nil, nil
}
func (fakeRepoNotFound) RecordMembershipSale(ctx context.Context, saleID string, m *domainmembership.Membership) error {
	return nil
}
func (fakeRepoNotFound) Create(ctx context.Context, m *domainmembership.Membership) error { return nil }
func (fakeRepoNotFound) Update(ctx context.Context, m *domainmembership.Membership) error { return nil }
func (fakeRepoNotFound) Cancel(ctx context.Context, id string) error { return nil }
func (fakeRepoNotFound) ListByCoach(ctx context.Context, coachID string) ([]*domainmembership.Membership, error) {
	return nil, nil
}
func (fakeRepoNotFound) GetPaymentHistory(ctx context.Context, athleteID string) ([]*domainmembership.Payment, error) {
	return nil, nil
}
func (fakeRepoNotFound) RecordPayment(ctx context.Context, p *domainmembership.Payment) error { return nil }

// newTestMembershipApp builds a fiber app with the membership status endpoint
// backed by a membership service whose repository reports "not found".
func newTestMembershipApp(t *testing.T) *fiber.App {
	t.Helper()
	svc := membershipapp.NewService(fakeRepoNotFound{})
	h := handlers.NewMembershipHandler(svc)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "athlete-"+uuid.NewString())
		return c.Next()
	})
	app.Get("/athletes/membership/status", h.GetMembershipStatus)
	return app
}

func TestGetMembershipStatus_NoMembership_Returns200WithNullMembership(t *testing.T) {
	app := newTestMembershipApp(t)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		HasActiveMembership bool        `json:"hasActiveMembership"`
		Status              string      `json:"status"`
		Membership          interface{} `json:"membership"`
		MembershipID        string      `json:"membershipId"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.False(t, body.HasActiveMembership)
	require.Equal(t, "none", body.Status)
	require.Nil(t, body.Membership)
	require.Empty(t, body.MembershipID)
}
