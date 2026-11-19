package analytics

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	analyticsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/analytics"
)

type fakeAnalyticsRepoCross struct {
	err error
}

func (f fakeAnalyticsRepoCross) GetDashboardSummary(ctx context.Context, coachID string) (*analyticsdomain.DashboardSummary, error) {
	return nil, f.err
}
func (f fakeAnalyticsRepoCross) GetHRZones(ctx context.Context, athleteID string) ([]analyticsdomain.HRZone, error) {
	return nil, f.err
}
func (f fakeAnalyticsRepoCross) GetFatigueMap(ctx context.Context, athleteID string) ([]analyticsdomain.FatigueMap, error) {
	return nil, f.err
}
func (f fakeAnalyticsRepoCross) GetOneRM(ctx context.Context, athleteID string) ([]analyticsdomain.OneRM, error) {
	return nil, f.err
}
func (f fakeAnalyticsRepoCross) GetTrainingSummary(ctx context.Context, coachID string) (*analyticsdomain.TrainingSummary, error) {
	return nil, f.err
}
func (f fakeAnalyticsRepoCross) GetEffort(ctx context.Context, athleteID string) ([]analyticsdomain.Effort, error) {
	return nil, f.err
}

func TestAnalytics_TrainingSummaryCoeffersRequestedCoach(t *testing.T) {
	errFake := assert.AnError
	repo := fakeAnalyticsRepoCross{err: errFake}
	svc := NewService(repo)
	_, err := svc.GetTrainingSummary(context.Background(), "coach-b")
	require.Error(t, err)
	assert.Equal(t, errFake, err)
}

func TestAnalytics_DashboardSummaryCoeffersRequestedCoach(t *testing.T) {
	repo := fakeAnalyticsRepoCross{err: nil}
	svc := NewService(repo)
	_, err := svc.GetDashboardSummary(context.Background(), "coach-a")
	require.NoError(t, err)
}
