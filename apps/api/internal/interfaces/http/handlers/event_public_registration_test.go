package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	eventapp "github.com/innotechlabs01/mr-training-api/internal/application/event"
	eventdomain "github.com/innotechlabs01/mr-training-api/internal/domain/event"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type stubEventRepoForPublicReg struct {
	events map[string]*eventdomain.Event
}

func (r *stubEventRepoForPublicReg) ListByCoach(_ context.Context, _ string) ([]*eventdomain.Event, error) {
	return nil, nil
}
func (r *stubEventRepoForPublicReg) ListByAthleteLinks(_ context.Context, _ string) ([]*eventdomain.Event, error) {
	return nil, nil
}
func (r *stubEventRepoForPublicReg) GetByID(_ context.Context, id string) (*eventdomain.Event, error) {
	ev, ok := r.events[id]
	if !ok {
		return nil, errors.NotFound("Event", id)
	}
	return ev, nil
}
func (r *stubEventRepoForPublicReg) Create(_ context.Context, _ *eventdomain.Event) error { return nil }
func (r *stubEventRepoForPublicReg) Update(_ context.Context, _ *eventdomain.Event) error { return nil }
func (r *stubEventRepoForPublicReg) Delete(_ context.Context, _ string) error             { return nil }
func (r *stubEventRepoForPublicReg) GetRegistration(_ context.Context, _, _ string) (*eventdomain.EventRegistration, error) {
	return nil, errors.NotFound("EventRegistration", "")
}
func (r *stubEventRepoForPublicReg) UpsertRegistration(_ context.Context, _ *eventdomain.EventRegistration) error {
	return nil
}
func (r *stubEventRepoForPublicReg) ListRegistrationsByAthlete(_ context.Context, _ string) ([]*eventdomain.Event, error) {
	return nil, nil
}
func (r *stubEventRepoForPublicReg) ListRegistrationsByEvent(_ context.Context, _ string) ([]*eventdomain.EventRegistration, error) {
	return nil, nil
}
func (r *stubEventRepoForPublicReg) SetAthletes(_ context.Context, _ string, _ []string) error {
	return nil
}
func (r *stubEventRepoForPublicReg) SetFormFields(_ context.Context, _ string, _ []eventdomain.EventFormField) error {
	return nil
}
func (r *stubEventRepoForPublicReg) SetListItems(_ context.Context, _ string, _ []string) error {
	return nil
}
func (r *stubEventRepoForPublicReg) GetFormResponses(_ context.Context, _, _ string) ([]eventdomain.EventFormResponse, error) {
	return nil, nil
}
func (r *stubEventRepoForPublicReg) SaveFormResponses(_ context.Context, _, _ string, _ []eventdomain.EventFormResponse) error {
	return nil
}
func (r *stubEventRepoForPublicReg) ListFormResponsesByEvent(_ context.Context, _ string) ([]eventdomain.EventFormResponse, error) {
	return nil, nil
}

type memPublicEventRegStore struct {
	regs []*PublicEventRegistration
}

func (m *memPublicEventRegStore) CountByEvent(_ context.Context, eventID string) (int, error) {
	n := 0
	for _, r := range m.regs {
		if r.EventID == eventID {
			n++
		}
	}
	return n, nil
}

func (m *memPublicEventRegStore) Insert(_ context.Context, reg *PublicEventRegistration) (bool, error) {
	for _, existing := range m.regs {
		if existing.EventID == reg.EventID && existing.Email == reg.Email {
			return false, nil
		}
	}
	reg.CreatedAt = "2026-11-25T00:00:00Z"
	cp := *reg
	m.regs = append(m.regs, &cp)
	return true, nil
}

func (m *memPublicEventRegStore) ListByEvent(_ context.Context, eventID string) ([]*PublicEventRegistration, error) {
	out := []*PublicEventRegistration{}
	for _, r := range m.regs {
		if r.EventID == eventID {
			out = append(out, r)
		}
	}
	return out, nil
}

func TestEventHandler_PublicEventRegisterAndList(t *testing.T) {
	repo := &stubEventRepoForPublicReg{
		events: map[string]*eventdomain.Event{
			"evt-pub": {
				ID:            "evt-pub",
				Title:         "5K Morning Run",
				Date:          "2026-12-01",
				Status:        "scheduled",
				IsPublic:      true,
				AcceptedCount: 2,
				CoachID:       "coach-1",
			},
			"evt-priv": {
				ID:       "evt-priv",
				Title:    "Private Session",
				Date:     "2026-12-01",
				Status:   "scheduled",
				IsPublic: false,
				CoachID:  "coach-1",
			},
			"evt-cancelled": {
				ID:       "evt-cancelled",
				Title:    "Cancelled Run",
				Date:     "2026-12-01",
				Status:   "cancelled",
				IsPublic: true,
				CoachID:  "coach-1",
			},
		},
	}

	svc := eventapp.NewService(repo)
	pubStore := &memPublicEventRegStore{}
	h := NewEventHandler(svc, nil, nil).WithPublicRegStore(pubStore)

	app := fiber.New()
	app.Get("/public/events/:id", h.GetPublicEvent)
	app.Post("/public/events/:id/register", h.RegisterPublicEvent)

	coachGroup := app.Group("/api/v1", func(c *fiber.Ctx) error {
		c.Locals(middleware.UserIDKey, c.Get("X-Test-Coach-ID"))
		c.Locals(middleware.CoachIDKey, c.Get("X-Test-Coach-ID"))
		c.Locals(middleware.UserRoleKey, "coach")
		return c.Next()
	})
	coachGroup.Get("/events/:id/public-registrations", h.ListPublicEventRegistrations)

	// 1. Private and cancelled events return 404 on GET /public/events/:id
	for _, id := range []string{"evt-priv", "evt-cancelled", "evt-missing"} {
		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/public/events/"+id, nil))
		if err != nil {
			t.Fatalf("GET %s failed: %v", id, err)
		}
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404 for %s, got %d", id, resp.StatusCode)
		}
	}

	// 2. Public registration succeeds with 201
	body := []byte(`{"full_name":"Ana Runner","email":"Ana@Example.com","phone":"3001234567","notes":"First 5K"}`)
	req := httptest.NewRequest(http.MethodPost, "/public/events/evt-pub/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("POST register failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}

	// 3. Duplicate email returns 409 Conflict
	req = httptest.NewRequest(http.MethodPost, "/public/events/evt-pub/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("POST duplicate failed: %v", err)
	}
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 for duplicate email, got %d", resp.StatusCode)
	}

	// 4. GET /public/events/:id returns event with registration_count = 3 (2 accepted + 1 public) and empty coach_id
	resp, err = app.Test(httptest.NewRequest(http.MethodGet, "/public/events/evt-pub", nil))
	if err != nil {
		t.Fatalf("GET public event failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var pubResp struct {
		ID                string `json:"id"`
		CoachID           string `json:"coach_id"`
		RegistrationCount int    `json:"registration_count"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&pubResp); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if pubResp.RegistrationCount != 3 || pubResp.CoachID != "" {
		t.Fatalf("unexpected public event response: %+v", pubResp)
	}

	// 5. Other coach gets 403 on GET /api/v1/events/:id/public-registrations
	req = httptest.NewRequest(http.MethodGet, "/api/v1/events/evt-pub/public-registrations", nil)
	req.Header.Set("X-Test-Coach-ID", "coach-other")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("GET other coach failed: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for other coach, got %d", resp.StatusCode)
	}

	// 6. Owner coach gets 200 with 1 registration
	req = httptest.NewRequest(http.MethodGet, "/api/v1/events/evt-pub/public-registrations", nil)
	req.Header.Set("X-Test-Coach-ID", "coach-1")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("GET owner coach failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for owner coach, got %d", resp.StatusCode)
	}
	var listResp []*PublicEventRegistration
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if len(listResp) != 1 || listResp[0].Email != "ana@example.com" {
		t.Fatalf("unexpected public registrations list: %+v", listResp)
	}
}
