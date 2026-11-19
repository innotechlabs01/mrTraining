package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	coachlandingapp "github.com/innotechlabs01/mr-training-api/internal/application/coach_landing"
	coachlandingdomain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_landing"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// fakeRepo is an in-memory, ownership-aware implementation of
// coach_landing.domain.Repository used to exercise the handler layer without
// a real database.
type fakeRepo struct {
	mu   sync.Mutex
	byID map[string]*coachlandingdomain.LandingPage
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{byID: make(map[string]*coachlandingdomain.LandingPage)}
}

func (r *fakeRepo) Create(ctx context.Context, lp *coachlandingdomain.LandingPage) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if lp.ID == "" {
		lp.ID = uuid.NewString()
	}
	r.byID[lp.ID] = lp
	return nil
}

func (r *fakeRepo) GetByID(ctx context.Context, id, coachID string) (*coachlandingdomain.LandingPage, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	lp, ok := r.byID[id]
	if !ok || lp.CoachID != coachID {
		return nil, coachlandingdomain.ErrNotFound
	}
	return lp, nil
}

func (r *fakeRepo) GetBySlug(ctx context.Context, slug string) (*coachlandingdomain.LandingPage, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, lp := range r.byID {
		if lp.Slug == slug && lp.IsPublished {
			return lp, nil
		}
	}
	return nil, coachlandingdomain.ErrNotFound
}

func (r *fakeRepo) GetByCoach(ctx context.Context, coachID string) ([]*coachlandingdomain.LandingPage, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []*coachlandingdomain.LandingPage{}
	for _, lp := range r.byID {
		if lp.CoachID == coachID {
			out = append(out, lp)
		}
	}
	return out, nil
}

func (r *fakeRepo) Update(ctx context.Context, id, coachID string, in coachlandingdomain.UpdateInput) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	lp, ok := r.byID[id]
	if !ok || lp.CoachID != coachID {
		return coachlandingdomain.ErrNotFound
	}
	if in.Title != "" {
		lp.Title = in.Title
	}
	if in.Subtitle != "" {
		lp.Subtitle = in.Subtitle
	}
	if in.Config != "" {
		lp.Config = in.Config
	}
	if in.Sections != "" {
		lp.Sections = in.Sections
	}
	if in.Images != "" {
		lp.Images = in.Images
	}
	return nil
}

func (r *fakeRepo) Delete(ctx context.Context, id, coachID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	lp, ok := r.byID[id]
	if !ok || lp.CoachID != coachID {
		return coachlandingdomain.ErrNotFound
	}
	delete(r.byID, id)
	return nil
}

func (r *fakeRepo) Publish(ctx context.Context, id, coachID string, published bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	lp, ok := r.byID[id]
	if !ok || lp.CoachID != coachID {
		return coachlandingdomain.ErrNotFound
	}
	lp.IsPublished = published
	return nil
}

// newTestApp mounts the CoachLandingHandler on a fresh fiber app. When
// coachID is non-empty a middleware injects it into c.Locals("coach_id")
// simulating a resolved tenant context; when empty the context is absent,
// which is what triggers the 403 path (no panic).
func newTestApp(t *testing.T, repo coachlandingdomain.Repository, coachID string) *fiber.App {
	t.Helper()
	svc := coachlandingapp.NewService(repo)
	h := handlers.NewCoachLandingHandler(svc)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if coachID != "" {
			c.Locals(middleware.CoachIDKey, coachID)
		}
		return c.Next()
	})

	// E2/E1/E3/E4/E5 live under /api/v1/coach/landing in production; here they
	// are mounted directly on the app root for isolated handler testing.
	h.RegisterRoutes(app)

	// E6 is public and registered on the root router (routes_setup.go:380).
	app.Get("/l/:slug", h.GetBySlug)
	return app
}

func bodyAsMap(t *testing.T, resp *http.Response) map[string]interface{} {
	t.Helper()
	var out map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
	return out
}

func TestCreate_WithoutTenantContext_Returns403NoPanic(t *testing.T) {
	repo := newFakeRepo()
	app := newTestApp(t, repo, "")

	body := `{"slug":"mi-landing","title":"Título","subtitle":"Sub","config":"{}","sections":"[]","images":"[]"}`
	req := httptest.NewRequest("POST", "/coach/landing", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestCreate_WithTenantContext_Returns200AndStoresCoachID(t *testing.T) {
	repo := newFakeRepo()
	app := newTestApp(t, repo, "coach-a")

	body := `{"slug":"mi-landing","title":"Título","subtitle":"Sub","config":"{}","sections":"[]","images":"[]"}`
	req := httptest.NewRequest("POST", "/coach/landing", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	out := bodyAsMap(t, resp)
	require.Equal(t, "coach-a", out["coach_id"])
	require.Equal(t, "mi-landing", out["slug"])
	require.Equal(t, "Título", out["title"])
	require.False(t, out["is_published"].(bool))
}

func TestGetByCoach_WithoutTenantContext_Returns403(t *testing.T) {
	repo := newFakeRepo()
	app := newTestApp(t, repo, "")

	req := httptest.NewRequest("GET", "/coach/landing", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestGetByCoach_WithTenantContext_ReturnsList(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:          "lp-1",
		CoachID:     "coach-a",
		Slug:        "uno",
		Title:       "Uno",
		IsPublished: false,
	}))
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:          "lp-2",
		CoachID:     "coach-b",
		Slug:        "dos",
		Title:       "Dos",
		IsPublished: true,
	}))

	app := newTestApp(t, repo, "coach-a")
	req := httptest.NewRequest("GET", "/coach/landing", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var list []*coachlandingdomain.LandingPage
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&list))
	require.Len(t, list, 1)
	require.Equal(t, "coach-a", list[0].CoachID)
	require.Equal(t, "uno", list[0].Slug)
}

func TestUpdate_WithoutTenantContext_Returns403(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:      "lp-1",
		CoachID: "coach-a",
		Slug:    "uno",
		Title:   "Uno",
	}))
	app := newTestApp(t, repo, "")

	req := httptest.NewRequest("PUT", "/coach/landing/lp-1", strings.NewReader(`{"title":"Nuevo"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestUpdate_OtherCoachCannotUpdate_Returns404(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:      "lp-1",
		CoachID: "coach-a",
		Slug:    "uno",
		Title:   "Uno",
	}))
	// coach-b tries to update coach-a's landing: ownership must block it.
	app := newTestApp(t, repo, "coach-b")

	req := httptest.NewRequest("PUT", "/coach/landing/lp-1", strings.NewReader(`{"title":"Hack"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestUpdate_OwnerCanUpdate_Returns200(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:      "lp-1",
		CoachID: "coach-a",
		Slug:    "uno",
		Title:   "Uno",
	}))
	app := newTestApp(t, repo, "coach-a")

	req := httptest.NewRequest("PUT", "/coach/landing/lp-1", strings.NewReader(`{"title":"Modificado"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	out := bodyAsMap(t, resp)
	require.Equal(t, true, out["updated"])
}

func TestPublish_WithoutTenantContext_Returns403(t *testing.T) {
	repo := newFakeRepo()
	app := newTestApp(t, repo, "")

	req := httptest.NewRequest("PUT", "/coach/landing/lp-1/publish", strings.NewReader(`{"is_published":true}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestPublish_OtherCoachCannotPublish_Returns404(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:      "lp-1",
		CoachID: "coach-a",
		Slug:    "uno",
		Title:   "Uno",
	}))
	app := newTestApp(t, repo, "coach-b")

	req := httptest.NewRequest("PUT", "/coach/landing/lp-1/publish", strings.NewReader(`{"is_published":true}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestPublish_FlipsIsPublishedAndPublicSlugServesOnlyWhenPublished(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:          "lp-1",
		CoachID:     "coach-a",
		Slug:        "mi-slug",
		Title:       "Mi landing",
		IsPublished: false,
	}))
	app := newTestApp(t, repo, "coach-a")

	// Unpublished: public /l/:slug must 404.
	req := httptest.NewRequest("GET", "/l/mi-slug", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusNotFound, resp.StatusCode)

	// Publish it.
	req = httptest.NewRequest("PUT", "/coach/landing/lp-1/publish", strings.NewReader(`{"is_published":true}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err = app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)
	out := bodyAsMap(t, resp)
	require.Equal(t, true, out["published"])

	// Now published: public /l/:slug must serve it.
	req = httptest.NewRequest("GET", "/l/mi-slug", nil)
	resp, err = app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)
	published := bodyAsMap(t, resp)
	require.Equal(t, "mi-slug", published["slug"])
	require.Equal(t, true, published["is_published"])

	// Unpublish: public /l/:slug must 404 again.
	req = httptest.NewRequest("PUT", "/coach/landing/lp-1/publish", strings.NewReader(`{"is_published":false}`))
	req.Header.Set("Content-Type", "application/json")
	_, err = app.Test(req)
	require.NoError(t, err)

	req = httptest.NewRequest("GET", "/l/mi-slug", nil)
	resp, err = app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestDelete_WithoutTenantContext_Returns403(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:      "lp-1",
		CoachID: "coach-a",
		Slug:    "uno",
		Title:   "Uno",
	}))
	app := newTestApp(t, repo, "")

	req := httptest.NewRequest("DELETE", "/coach/landing/lp-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestDelete_OtherCoachCannotDelete_Returns404(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:      "lp-1",
		CoachID: "coach-a",
		Slug:    "uno",
		Title:   "Uno",
	}))
	app := newTestApp(t, repo, "coach-b")

	req := httptest.NewRequest("DELETE", "/coach/landing/lp-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestDelete_OwnerCanDelete_Returns200(t *testing.T) {
	repo := newFakeRepo()
	require.NoError(t, repo.Create(context.Background(), &coachlandingdomain.LandingPage{
		ID:      "lp-1",
		CoachID: "coach-a",
		Slug:    "uno",
		Title:   "Uno",
	}))
	app := newTestApp(t, repo, "coach-a")

	req := httptest.NewRequest("DELETE", "/coach/landing/lp-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	out := bodyAsMap(t, resp)
	require.Equal(t, true, out["deleted"])

	// Verify it is gone.
	lp, err := repo.GetByID(context.Background(), "lp-1", "coach-a")
	require.Error(t, err)
	require.Nil(t, lp)
}
