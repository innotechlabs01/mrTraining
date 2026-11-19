package handlers

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/application/coach"
	coachdomain "github.com/innotechlabs01/mr-training-api/internal/domain/coach"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type fakeCoachHandlerRepo struct {
	athlete *coachdomain.CoachAthlete
}

func (fakeCoachHandlerRepo) GetBySlug(ctx context.Context, slug string) (*coachdomain.Coach, error) {
	return nil, nil
}
func (fakeCoachHandlerRepo) GetDashboard(ctx context.Context, coachID string) (*coachdomain.Dashboard, error) {
	return nil, nil
}
func (fakeCoachHandlerRepo) GetDailySummary(ctx context.Context, coachID string) (*coachdomain.DailySummary, error) {
	return nil, nil
}
func (fakeCoachHandlerRepo) GetTimeBlocks(ctx context.Context, coachID string) ([]*coachdomain.TimeBlock, error) {
	return nil, nil
}
func (fakeCoachHandlerRepo) SaveTimeBlocks(ctx context.Context, coachID string, blocks []*coachdomain.TimeBlock) error {
	return nil
}
func (fakeCoachHandlerRepo) GetAppointments(ctx context.Context, coachID string) ([]*coachdomain.Appointment, error) {
	return nil, nil
}
func (fakeCoachHandlerRepo) CreateAppointment(ctx context.Context, apt *coachdomain.Appointment) error {
	return nil
}
func (fakeCoachHandlerRepo) UpdateAppointment(ctx context.Context, id string, apt *coachdomain.Appointment) error {
	return nil
}
func (fakeCoachHandlerRepo) GetAvailability(ctx context.Context, coachID string) ([]*coachdomain.CoachAvailability, error) {
	return nil, nil
}
func (fakeCoachHandlerRepo) SaveAvailability(ctx context.Context, coachID string, slots []*coachdomain.CoachAvailability) error {
	return nil
}
func (f fakeCoachHandlerRepo) GetAthleteById(ctx context.Context, coachID string, athleteID string) (*coachdomain.CoachAthlete, error) {
	if f.athlete != nil && f.athlete.CoachID == coachID && f.athlete.ID == athleteID {
		return f.athlete, nil
	}
	return nil, nil
}
func (f fakeCoachHandlerRepo) DeleteAthlete(ctx context.Context, coachID string, athleteID string) error {
	if f.athlete != nil && f.athlete.CoachID != coachID {
		return errors.Forbidden("cannot delete foreign athlete")
	}
	return nil
}
func (f fakeCoachHandlerRepo) SaveAthlete(ctx context.Context, coachID string, a *coachdomain.CoachAthlete) error {
	if f.athlete != nil && f.athlete.CoachID != coachID {
		return errors.Forbidden("cannot modify foreign athlete")
	}
	return nil
}

func TestCoachHandler_GetAthleteById_CrossCoachDenied(t *testing.T) {
	repo := fakeCoachHandlerRepo{athlete: &coachdomain.CoachAthlete{ID: "athlete-1", CoachID: "coach-b"}}
	svc := coach.NewService(repo)
	h := NewCoachHandler(svc, nil)
	app := fiber.New()
	app.Get("/coach/athletes/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.GetAthleteById(c)
	})
	req := httptest.NewRequest("GET", "/coach/athletes/athlete-1", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode == fiber.StatusOK {
		t.Fatalf("expected non-200 cross-coach read, got %d", resp.StatusCode)
	}
}

func TestCoachHandler_GetAthleteById_OwnAllowed(t *testing.T) {
	repo := fakeCoachHandlerRepo{athlete: &coachdomain.CoachAthlete{ID: "athlete-1", CoachID: "coach-a", Name: "A"}}
	svc := coach.NewService(repo)
	h := NewCoachHandler(svc, nil)
	app := fiber.New()
	app.Get("/coach/athletes/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.GetAthleteById(c)
	})
	req := httptest.NewRequest("GET", "/coach/athletes/athlete-1", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestCoachHandler_DeleteAthlete_CrossCoachDenied(t *testing.T) {
	repo := fakeCoachHandlerRepo{athlete: &coachdomain.CoachAthlete{ID: "athlete-1", CoachID: "coach-b"}}
	svc := coach.NewService(repo)
	h := NewCoachHandler(svc, nil)
	app := fiber.New()
	app.Delete("/coach/athletes/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.DeleteAthlete(c)
	})
	req := httptest.NewRequest("DELETE", "/coach/athletes/athlete-1", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode == fiber.StatusOK {
		t.Fatalf("expected denial, got 200")
	}
}

func TestCoachHandler_MissingTenantReturns403(t *testing.T) {
	h := NewCoachHandler(nil, nil)
	app := fiber.New()
	app.Get("/coach/athletes/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		return h.GetAthleteById(c)
	})
	req := httptest.NewRequest("GET", "/coach/athletes/athlete-1", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}
