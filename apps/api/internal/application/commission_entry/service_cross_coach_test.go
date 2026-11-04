package commission_entry

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
)

type fakeCommissionRepoCross struct {
	entry *domain.CommissionEntry
}

func (f *fakeCommissionRepoCross) GetCommissionEntry(ctx context.Context, entryID, coachID string) (*domain.CommissionEntry, error) {
	if f.entry != nil && f.entry.ID == entryID && f.entry.CoachID == coachID {
		return f.entry, nil
	}
	return nil, domain.ErrNotFound
}
func (f *fakeCommissionRepoCross) ListCommissionEntriesByCoach(ctx context.Context, coachID string) ([]*domain.CommissionEntry, error) {
	return nil, nil
}
func (f *fakeCommissionRepoCross) ListCommissionEntriesByAlly(ctx context.Context, allyID string) ([]*domain.CommissionEntry, error) {
	return nil, nil
}
func (f *fakeCommissionRepoCross) GetOpenCommissionEntryByOperation(ctx context.Context, operationID string) (*domain.CommissionEntry, error) {
	return nil, domain.ErrNotFound
}
func (f *fakeCommissionRepoCross) GetOperationForCommission(ctx context.Context, operationID string) (string, int64, string, error) {
	return "", 0, "", fmt.Errorf("not implemented")
}
func (f *fakeCommissionRepoCross) GetActiveDeclarationStatus(ctx context.Context, operationID string) (string, error) {
	return "", fmt.Errorf("not implemented")
}
func (f *fakeCommissionRepoCross) GetActiveAgreement(ctx context.Context, relationshipID string) (string, int64, int64, int, error) {
	return "", 0, 0, 0, fmt.Errorf("not implemented")
}
func (f *fakeCommissionRepoCross) CreateCommissionEntry(ctx context.Context, in domain.CreateCommissionEntryInput, actorID string) (*domain.CommissionEntry, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCommissionRepoCross) CreateCommissionEntryDirect(ctx context.Context, in domain.CreateCommissionEntryInput, actorID string) (*domain.CommissionEntry, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCommissionRepoCross) ReverseCommissionEntry(ctx context.Context, entryID, reverserID, reason string) (*domain.CommissionEntry, *domain.FinancialAdjustment, error) {
	return nil, nil, fmt.Errorf("not implemented")
}
func (f *fakeCommissionRepoCross) CreateFinancialAdjustment(ctx context.Context, in domain.CreateFinancialAdjustmentInput, actorID string) (*domain.FinancialAdjustment, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCommissionRepoCross) ListFinancialAdjustmentsByEntry(ctx context.Context, entryID string) ([]*domain.FinancialAdjustment, error) {
	return nil, nil
}

func TestServiceCommissionEntry_GetCrossCoachDenied(t *testing.T) {
	repo := &fakeCommissionRepoCross{entry: &domain.CommissionEntry{ID: "entry-1", CoachID: "coach-b"}}
	svc := NewService(repo)
	_, err := svc.GetCommissionEntry(context.Background(), "entry-1", "coach-a")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "commission entry not found")
}

func TestServiceCommissionEntry_ListByCoachIsolated(t *testing.T) {
	repo := &fakeCommissionRepoCross{}
	svc := NewService(repo)
	got, err := svc.ListCommissionEntriesByCoach(context.Background(), "coach-a")
	require.NoError(t, err)
	assert.Nil(t, got)
}