package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	msgapp "github.com/innotechlabs01/mr-training-api/internal/application/message"
	planapp "github.com/innotechlabs01/mr-training-api/internal/application/plan"
	msgdomain "github.com/innotechlabs01/mr-training-api/internal/domain/message"
	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type stubHandlerPlanRepo struct {
	plans map[string]*plandomain.Plan
}

func (r *stubHandlerPlanRepo) ListByCoach(_ context.Context, _ string, _ bool) ([]*plandomain.Plan, error) {
	return nil, nil
}
func (r *stubHandlerPlanRepo) ListAllActive(_ context.Context) ([]*plandomain.Plan, error) {
	return nil, nil
}
func (r *stubHandlerPlanRepo) GetByID(_ context.Context, id string) (*plandomain.Plan, error) {
	p, ok := r.plans[id]
	if !ok {
		return nil, apperrors.NotFound("Plan", id)
	}
	cp := *p
	return &cp, nil
}
func (r *stubHandlerPlanRepo) Create(_ context.Context, p *plandomain.Plan) error {
	r.plans[p.ID] = p
	return nil
}
func (r *stubHandlerPlanRepo) Update(_ context.Context, p *plandomain.Plan) error {
	cp := *p
	r.plans[p.ID] = &cp
	return nil
}
func (r *stubHandlerPlanRepo) Delete(_ context.Context, _ string) error { return nil }
func (r *stubHandlerPlanRepo) ListVersionsByPlan(_ context.Context, _ string) ([]*plandomain.Version, error) {
	return nil, nil
}

func TestPlanHandler_UpdatePlan_SuperAdminAndNonOwner(t *testing.T) {
	repo := &stubHandlerPlanRepo{
		plans: map[string]*plandomain.Plan{
			"plan-1": {ID: "plan-1", Name: "Basic", Price: 100, CoachID: "coach-a"},
		},
	}
	svc := planapp.NewService(repo)
	h := NewPlanHandler(svc, nil, nil)

	runUpdate := func(userID, role string) int {
		app := fiber.New()
		app.Put("/plans/:id", func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: userID, Role: role})
			return h.UpdatePlan(c)
		})
		body := bytes.NewBufferString(`{"name":"Pro"}`)
		req := httptest.NewRequest(http.MethodPut, "/plans/plan-1", body)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		return resp.StatusCode
	}

	require.Equal(t, http.StatusForbidden, runUpdate("coach-b", "coach"))
	require.Equal(t, "Basic", repo.plans["plan-1"].Name)

	require.Equal(t, http.StatusOK, runUpdate("admin-user", "super_admin"))
	require.Equal(t, "Pro", repo.plans["plan-1"].Name)

	require.Equal(t, http.StatusOK, runUpdate("org-admin", "admin"))
}

type stubMessageRepo struct {
	thread   *msgdomain.MessageThread
	lastSent *msgdomain.Message
}

func (r *stubMessageRepo) GetThreads(_ context.Context, _ string) ([]*msgdomain.MessageThread, error) {
	return nil, nil
}
func (r *stubMessageRepo) GetThread(_ context.Context, threadID string) (*msgdomain.MessageThread, error) {
	if r.thread != nil && r.thread.ID == threadID {
		return r.thread, nil
	}
	return nil, apperrors.NotFound("Thread", threadID)
}
func (r *stubMessageRepo) CreateThread(_ context.Context, _ *msgdomain.MessageThread) error {
	return nil
}
func (r *stubMessageRepo) GetMessages(_ context.Context, _ string) ([]*msgdomain.Message, error) {
	return nil, nil
}
func (r *stubMessageRepo) SendMessage(_ context.Context, msg *msgdomain.Message) error {
	cp := *msg
	r.lastSent = &cp
	return nil
}
func (r *stubMessageRepo) MarkThreadRead(_ context.Context, _, _ string) error { return nil }

func TestMessageHandler_AddMessage_DerivesSenderRole(t *testing.T) {
	repo := &stubMessageRepo{
		thread: &msgdomain.MessageThread{
			ID:        "t-1",
			CoachID:   "coach-1",
			AthleteID: "athlete-1",
		},
	}
	svc := msgapp.NewService(repo)
	h := NewMessageHandler(svc, nil)

	sendAs := func(userID, role string) string {
		app := fiber.New()
		app.Post("/messages/:id/messages", func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: userID, Role: role})
			return h.AddMessage(c)
		})
		req := httptest.NewRequest(http.MethodPost, "/messages/t-1/messages", bytes.NewBufferString(`{"content":"hello"}`))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		var out struct {
			SenderRole string `json:"sender_role"`
		}
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
		return out.SenderRole
	}

	require.Equal(t, "athlete", sendAs("athlete-1", "athlete"))
	require.Equal(t, "athlete", repo.lastSent.SenderRole)

	require.Equal(t, "coach", sendAs("coach-1", "coach"))
	require.Equal(t, "coach", repo.lastSent.SenderRole)
}
