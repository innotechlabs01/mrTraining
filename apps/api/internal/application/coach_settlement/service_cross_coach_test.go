package coach_settlement

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_settlement"
)

type fakeSettlementRepoCross struct {
	settlement *domain.CoachSettlement
}

func (f *fakeSettlementRepoCross) CreateSettlement(ctx context.Context, in domain.CreateSettlementInput, actorID string) (*domain.CoachSettlement, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) CalculateSettlement(ctx context.Context, settlementID, actorID string) (*domain.CoachSettlement, []*domain.SettlementItem, error) {
	return nil, nil, nil
}
func (f *fakeSettlementRepoCross) GetSettlement(ctx context.Context, settlementID, coachID string) (*domain.CoachSettlement, error) {
	if f.settlement != nil && f.settlement.ID == settlementID && f.settlement.CoachID == coachID {
		return f.settlement, nil
	}
	return nil, domain.ErrNotFound
}
func (f *fakeSettlementRepoCross) ListSettlementsByCoach(ctx context.Context, coachID string) ([]*domain.CoachSettlement, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) ListSettlementsByAlly(ctx context.Context, allyID string) ([]*domain.CoachSettlement, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) ListSettlementsForAdmin(ctx context.Context) ([]*domain.CoachSettlement, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) UpdateSettlementStatus(ctx context.Context, settlementID, actorID string, status string, note string) (*domain.CoachSettlement, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) VoidSettlement(ctx context.Context, settlementID, actorID string, reason string) (*domain.CoachSettlement, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) ListSettlementItems(ctx context.Context, settlementID string) ([]*domain.SettlementItem, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) CreateSettlementDocument(ctx context.Context, in domain.CreateSettlementDocumentInput, actorID string) (*domain.SettlementDocument, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) ListSettlementDocuments(ctx context.Context, settlementID string) ([]*domain.SettlementDocument, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) CreateCoachPaymentRecord(ctx context.Context, in domain.CreateCoachPaymentRecordInput, actorID string) (*domain.CoachPaymentRecord, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) ConfirmCoachPaymentRecord(ctx context.Context, recordID, actorID string) (*domain.CoachPaymentRecord, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) ListCoachPaymentRecords(ctx context.Context, coachID string, allyID string) ([]*domain.CoachPaymentRecord, error) {
	return nil, nil
}
func (f *fakeSettlementRepoCross) GetEligibleEntriesForPeriod(ctx context.Context, coachID, allyID, periodStart, periodEnd string) ([]*domain.SettlementItemCandidate, error) {
	return nil, nil
}

func TestServiceCoachSettlement_GetCrossCoachDenied(t *testing.T) {
	repo := &fakeSettlementRepoCross{settlement: &domain.CoachSettlement{ID: "set-1", CoachID: "coach-b"}}
	svc := NewService(repo)
	_, err := svc.GetSettlement(context.Background(), "set-1", "coach-a")
	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestServiceCoachSettlement_GetOwnAllowed(t *testing.T) {
	repo := &fakeSettlementRepoCross{settlement: &domain.CoachSettlement{ID: "set-1", CoachID: "coach-a"}}
	svc := NewService(repo)
	got, err := svc.GetSettlement(context.Background(), "set-1", "coach-a")
	require.NoError(t, err)
	require.NotNil(t, got)
}