package handlers

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	coachsetapp "github.com/innotechlabs01/mr-training-api/internal/application/coach_settlement"
	domaincs "github.com/innotechlabs01/mr-training-api/internal/domain/coach_settlement"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type fakeCoachSettlementHandlerRepo struct {
	settlement *domaincs.CoachSettlement
}

func (m *fakeCoachSettlementHandlerRepo) CreateSettlement(ctx context.Context, in domaincs.CreateSettlementInput, actorID string) (*domaincs.CoachSettlement, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) CalculateSettlement(ctx context.Context, settlementID, actorID string) (*domaincs.CoachSettlement, []*domaincs.SettlementItem, error) {
	return nil, nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) GetSettlement(ctx context.Context, settlementID, coachID string) (*domaincs.CoachSettlement, error) {
	if m.settlement != nil && m.settlement.ID == settlementID && m.settlement.CoachID == coachID {
		return m.settlement, nil
	}
	return nil, domaincs.ErrNotFound
}
func (m *fakeCoachSettlementHandlerRepo) ListSettlementsByCoach(ctx context.Context, coachID string) ([]*domaincs.CoachSettlement, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) ListSettlementsByAlly(ctx context.Context, allyID string) ([]*domaincs.CoachSettlement, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) ListSettlementsForAdmin(ctx context.Context) ([]*domaincs.CoachSettlement, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) UpdateSettlementStatus(ctx context.Context, settlementID, actorID, status, note string) (*domaincs.CoachSettlement, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) VoidSettlement(ctx context.Context, settlementID, actorID, reason string) (*domaincs.CoachSettlement, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) ListSettlementItems(ctx context.Context, settlementID string) ([]*domaincs.SettlementItem, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) CreateSettlementDocument(ctx context.Context, in domaincs.CreateSettlementDocumentInput, actorID string) (*domaincs.SettlementDocument, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) ListSettlementDocuments(ctx context.Context, settlementID string) ([]*domaincs.SettlementDocument, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) CreateCoachPaymentRecord(ctx context.Context, in domaincs.CreateCoachPaymentRecordInput, actorID string) (*domaincs.CoachPaymentRecord, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) ConfirmCoachPaymentRecord(ctx context.Context, recordID, actorID string) (*domaincs.CoachPaymentRecord, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) ListCoachPaymentRecords(ctx context.Context, coachID, allyID string) ([]*domaincs.CoachPaymentRecord, error) {
	return nil, nil
}
func (m *fakeCoachSettlementHandlerRepo) GetEligibleEntriesForPeriod(ctx context.Context, coachID, allyID, periodStart, periodEnd string) ([]*domaincs.SettlementItemCandidate, error) {
	return nil, nil
}

func TestCoachSettlementHandler_OwnAllowed(t *testing.T) {
	repo := &fakeCoachSettlementHandlerRepo{settlement: &domaincs.CoachSettlement{ID: "set-1", CoachID: "coach-a"}}
	svc := coachsetapp.NewService(repo)
	h := NewCoachSettlementHandler(svc, nil)
	app := fiber.New()
	app.Get("/coach/settlements/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.GetSettlement(c)
	})
	req := httptest.NewRequest("GET", "/coach/settlements/set-1", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestCoachSettlementHandler_CrossCoachDenied(t *testing.T) {
	repo := &fakeCoachSettlementHandlerRepo{settlement: &domaincs.CoachSettlement{ID: "set-1", CoachID: "coach-b"}}
	svc := coachsetapp.NewService(repo)
	h := NewCoachSettlementHandler(svc, nil)
	app := fiber.New()
	app.Get("/coach/settlements/:id", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "coach-a")
		c.Locals(string(middleware.CoachIDKey), "coach-a")
		return h.GetSettlement(c)
	})
	req := httptest.NewRequest("GET", "/coach/settlements/set-1", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}
