package handlers

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	commapp "github.com/innotechlabs01/mr-training-api/internal/application/commission_entry"
	domainentry "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type fakeCommissionHandlerRepo struct {
	entry *domainentry.CommissionEntry
}

func (f *fakeCommissionHandlerRepo) ListCommissionEntriesByCoach(ctx context.Context, coachID string) ([]*domainentry.CommissionEntry, error) {
	return nil, nil
}
func (f *fakeCommissionHandlerRepo) GetCommissionEntry(ctx context.Context, entryID, coachID string) (*domainentry.CommissionEntry, error) {
	if f.entry != nil && f.entry.ID == entryID && f.entry.CoachID == coachID {
		return f.entry, nil
	}
	return nil, domainentry.ErrNotFound
}
func (f *fakeCommissionHandlerRepo) ListCommissionEntriesByAlly(ctx context.Context, allyID string) ([]*domainentry.CommissionEntry, error) {
	return nil, nil
}
func (f *fakeCommissionHandlerRepo) GetOpenCommissionEntryByOperation(ctx context.Context, operationID string) (*domainentry.CommissionEntry, error) {
	return nil, domainentry.ErrNotFound
}
func (f *fakeCommissionHandlerRepo) GetOperationForCommission(ctx context.Context, operationID string) (string, int64, string, error) {
	return "", 0, "", nil
}
func (f *fakeCommissionHandlerRepo) GetActiveDeclarationStatus(ctx context.Context, operationID string) (string, error) {
	return "", nil
}
func (f *fakeCommissionHandlerRepo) GetActiveAgreement(ctx context.Context, relationshipID string) (string, int64, int64, int, error) {
	return "", 0, 0, 0, nil
}
func (f *fakeCommissionHandlerRepo) CreateCommissionEntry(ctx context.Context, in domainentry.CreateCommissionEntryInput, actorID string) (*domainentry.CommissionEntry, error) {
	return nil, nil
}
func (f *fakeCommissionHandlerRepo) CreateCommissionEntryDirect(ctx context.Context, in domainentry.CreateCommissionEntryInput, actorID string) (*domainentry.CommissionEntry, error) {
	return nil, nil
}
func (f *fakeCommissionHandlerRepo) ReverseCommissionEntry(ctx context.Context, entryID, reverserID, reason string) (*domainentry.CommissionEntry, *domainentry.FinancialAdjustment, error) {
	return nil, nil, nil
}
func (f *fakeCommissionHandlerRepo) CreateFinancialAdjustment(ctx context.Context, in domainentry.CreateFinancialAdjustmentInput, actorID string) (*domainentry.FinancialAdjustment, error) {
	return nil, nil
}
func (f *fakeCommissionHandlerRepo) ListFinancialAdjustmentsByEntry(ctx context.Context, entryID string) ([]*domainentry.FinancialAdjustment, error) {
	return nil, nil
}

func mustReqHandler(fn func(c *fiber.Ctx) error) func(*fiber.Ctx) error { return fn }

func TestCommissionEntryHandler_MissingTenantReturns403(t *testing.T) {
	svc := commapp.NewService(&fakeCommissionHandlerRepo{})
	h := NewCommissionEntryHandler(svc, nil)
	app := fiber.New()
	app.Get("/coach/commission-entries", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		return h.ListCommissionEntries(c)
	})
	req := httptest.NewRequest("GET", "/coach/commission-entries", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}

func TestCommissionEntryHandler_OwnAllowed(t *testing.T) {
	repo := &fakeCommissionHandlerRepo{entry: &domainentry.CommissionEntry{ID: "entry-1", CoachID: "coach-a"}}
	svc := commapp.NewService(repo)
	h := NewCommissionEntryHandler(svc, nil)
	app := fiber.New()
	app.Get("/coach/commission-entries/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.GetCommissionEntry(c)
	})
	req := httptest.NewRequest("GET", "/coach/commission-entries/entry-1", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestCommissionEntryHandler_CrossCoachDenied(t *testing.T) {
	repo := &fakeCommissionHandlerRepo{entry: &domainentry.CommissionEntry{ID: "entry-1", CoachID: "coach-b"}}
	svc := commapp.NewService(repo)
	h := NewCommissionEntryHandler(svc, nil)
	app := fiber.New()
	app.Get("/coach/commission-entries/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.GetCommissionEntry(c)
	})
	req := httptest.NewRequest("GET", "/coach/commission-entries/entry-1", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}
