package plan

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

type stubPlanRepo struct {
	plans map[string]*plandomain.Plan
}

func newStubPlanRepo() *stubPlanRepo {
	return &stubPlanRepo{plans: make(map[string]*plandomain.Plan)}
}

func (r *stubPlanRepo) ListByCoach(_ context.Context, _ string, _ bool) ([]*plandomain.Plan, error) {
	return nil, nil
}
func (r *stubPlanRepo) ListAllActive(_ context.Context) ([]*plandomain.Plan, error) {
	return nil, nil
}
func (r *stubPlanRepo) GetByID(_ context.Context, id string) (*plandomain.Plan, error) {
	p, ok := r.plans[id]
	if !ok {
		return nil, apperrors.NotFound("Plan", id)
	}
	cp := *p
	return &cp, nil
}
func (r *stubPlanRepo) Create(_ context.Context, p *plandomain.Plan) error {
	cp := *p
	r.plans[p.ID] = &cp
	return nil
}
func (r *stubPlanRepo) Update(_ context.Context, p *plandomain.Plan) error {
	cp := *p
	r.plans[p.ID] = &cp
	return nil
}
func (r *stubPlanRepo) Delete(_ context.Context, _ string) error { return nil }
func (r *stubPlanRepo) ListVersionsByPlan(_ context.Context, _ string) ([]*plandomain.Version, error) {
	return nil, nil
}

func TestService_UpdatePlan(t *testing.T) {
	repo := newStubPlanRepo()
	repo.plans["plan-1"] = &plandomain.Plan{
		ID:      "plan-1",
		Name:    "Original Plan",
		Price:   100,
		CoachID: "coach-owner",
	}
	svc := NewService(repo)
	newName := "Updated Plan"

	t.Run("non-owner coach is forbidden", func(t *testing.T) {
		_, err := svc.UpdatePlan(context.Background(), "coach-other", "plan-1", false, dto.UpdatePlanRequest{Name: &newName})
		require.Error(t, err)
		var appErr *apperrors.AppError
		require.True(t, errors.As(err, &appErr))
		require.Equal(t, 403, appErr.Status)
		require.Equal(t, "Original Plan", repo.plans["plan-1"].Name)
	})

	t.Run("super admin can update any coach plan", func(t *testing.T) {
		updated, err := svc.UpdatePlan(context.Background(), "super-admin-1", "plan-1", true, dto.UpdatePlanRequest{Name: &newName})
		require.NoError(t, err)
		require.Equal(t, "Updated Plan", updated.Name)
		require.Equal(t, "coach-owner", updated.CoachID)
	})

	t.Run("owning coach can update own plan", func(t *testing.T) {
		ownerName := "Owner Updated"
		updated, err := svc.UpdatePlan(context.Background(), "coach-owner", "plan-1", false, dto.UpdatePlanRequest{Name: &ownerName})
		require.NoError(t, err)
		require.Equal(t, "Owner Updated", updated.Name)
	})
}
