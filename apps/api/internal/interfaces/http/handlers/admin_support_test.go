package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	supportapp "github.com/innotechlabs01/mr-training-api/internal/application/support"
	supportdomain "github.com/innotechlabs01/mr-training-api/internal/domain/support"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type stubSupportRepo struct {
	tickets  map[string]*supportdomain.SupportTicket
	messages []*supportdomain.TicketMessage
}

func newStubSupportRepo() *stubSupportRepo {
	return &stubSupportRepo{
		tickets: map[string]*supportdomain.SupportTicket{
			"ticket-1": {
				ID:           "ticket-1",
				TicketNumber: 1,
				Subject:      "Help",
				Category:     supportdomain.TicketCategoryProblem,
				Priority:     supportdomain.TicketPriorityMedium,
				Status:       supportdomain.TicketStatusOpen,
				CoachID:      "coach-1",
			},
		},
	}
}

func (s *stubSupportRepo) ListByCoach(_ context.Context, coachID string, _ *supportdomain.TicketStatus) ([]*supportdomain.SupportTicket, error) {
	var out []*supportdomain.SupportTicket
	for _, t := range s.tickets {
		if t.CoachID == coachID {
			out = append(out, t)
		}
	}
	return out, nil
}

func (s *stubSupportRepo) ListAll(_ context.Context, status *supportdomain.TicketStatus) ([]*supportdomain.SupportTicket, error) {
	var out []*supportdomain.SupportTicket
	for _, t := range s.tickets {
		if status == nil || t.Status == *status {
			out = append(out, t)
		}
	}
	return out, nil
}

func (s *stubSupportRepo) GetByID(_ context.Context, id string) (*supportdomain.SupportTicket, error) {
	t, ok := s.tickets[id]
	if !ok {
		return nil, errors.NotFound("SupportTicket", id)
	}
	return t, nil
}

func (s *stubSupportRepo) Create(_ context.Context, t *supportdomain.SupportTicket) error {
	s.tickets[t.ID] = t
	return nil
}

func (s *stubSupportRepo) Update(_ context.Context, t *supportdomain.SupportTicket) error {
	s.tickets[t.ID] = t
	return nil
}

func (s *stubSupportRepo) Delete(_ context.Context, id string) error {
	delete(s.tickets, id)
	return nil
}

func (s *stubSupportRepo) ListByAthlete(_ context.Context, athleteID string, _ *supportdomain.TicketStatus) ([]*supportdomain.SupportTicket, error) {
	return nil, nil
}

func (s *stubSupportRepo) ListMessages(_ context.Context, ticketID string) ([]*supportdomain.TicketMessage, error) {
	return s.messages, nil
}

func (s *stubSupportRepo) GetMessageByID(_ context.Context, id string) (*supportdomain.TicketMessage, error) {
	return nil, errors.NotFound("TicketMessage", id)
}

func (s *stubSupportRepo) CreateMessage(_ context.Context, msg *supportdomain.TicketMessage) error {
	s.messages = append(s.messages, msg)
	return nil
}

func (s *stubSupportRepo) MarkMessagesRead(_ context.Context, _, _ string, _ supportdomain.TicketAuthor) error {
	return nil
}

func (s *stubSupportRepo) GetUnreadCount(_ context.Context, _, _ string, _ supportdomain.TicketAuthor) (int, error) {
	return 0, nil
}

func setupAdminSupportTestApp(cfg *middleware.TestAuthConfig, allowedID string) (*fiber.App, *stubSupportRepo) {
	repo := newStubSupportRepo()
	svc := supportapp.NewService(repo, nil)
	h := NewSupportHandler(svc, nil)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if cfg != nil {
			middleware.SetTestAuth(c, *cfg)
		}
		return c.Next()
	})

	admin := app.Group("/admin/tickets", middleware.RequirePlatformSuperAdmin(allowedID))
	admin.Get("/", h.AdminListTickets)
	admin.Post("/", h.AdminCreateTicket)
	admin.Get("/:ticketId", h.AdminGetTicket)
	admin.Get("/:ticketId/messages", h.AdminListMessages)
	admin.Post("/:ticketId/messages", h.AdminAddMessage)
	admin.Post("/:ticketId/resolve", h.AdminResolveTicket)
	admin.Post("/:ticketId/reopen", h.AdminReopenTicket)
	admin.Post("/:ticketId/read", h.AdminMarkRead)

	return app, repo
}

func TestAdminSupportRoutes_SuperAdminGuard(t *testing.T) {
	allowedID := "super-admin-1"
	cases := []struct {
		name string
		cfg  *middleware.TestAuthConfig
		want int
	}{
		{name: "anonymous", cfg: nil, want: http.StatusUnauthorized},
		{name: "coach", cfg: &middleware.TestAuthConfig{UserID: "coach-1", Role: "coach"}, want: http.StatusForbidden},
		{name: "athlete", cfg: &middleware.TestAuthConfig{UserID: "athlete-1", Role: "athlete"}, want: http.StatusForbidden},
		{name: "super_admin", cfg: &middleware.TestAuthConfig{UserID: allowedID, Role: "super_admin"}, want: http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app, _ := setupAdminSupportTestApp(tc.cfg, allowedID)
			req := httptest.NewRequest(http.MethodGet, "/admin/tickets", nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			require.Equal(t, tc.want, resp.StatusCode)
		})
	}
}

func TestAdminSupportRoutes_ResolveReopenAndMessage(t *testing.T) {
	allowedID := "super-admin-1"
	app, repo := setupAdminSupportTestApp(&middleware.TestAuthConfig{UserID: allowedID, Role: "super_admin"}, allowedID)

	// Resolve
	req := httptest.NewRequest(http.MethodPost, "/admin/tickets/ticket-1/resolve", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	require.Equal(t, supportdomain.TicketStatusResolved, repo.tickets["ticket-1"].Status)

	// Reopen
	req = httptest.NewRequest(http.MethodPost, "/admin/tickets/ticket-1/reopen", nil)
	resp, err = app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	require.Equal(t, supportdomain.TicketStatusOpen, repo.tickets["ticket-1"].Status)

	// Add message as super_admin
	body := bytes.NewBufferString(`{"body":"We are looking into this."}`)
	req = httptest.NewRequest(http.MethodPost, "/admin/tickets/ticket-1/messages", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err = app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	require.Len(t, repo.messages, 1)
	require.Equal(t, supportdomain.TicketAuthorSupport, repo.messages[0].Author)
}
