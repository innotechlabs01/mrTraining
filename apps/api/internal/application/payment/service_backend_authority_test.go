package payment

import (
	"context"
	"net/http"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/stretchr/testify/require"
)

type fakeMembershipReader struct {
	m   *membership.Membership
	err error
}

func (f fakeMembershipReader) GetMembership(context.Context, string) (*membership.Membership, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.m, nil
}

func (f fakeMembershipReader) ActivateAfterPayment(context.Context, string, string, float64) error {
	return nil
}

func TestCreateMembershipPreference_NoMembership_BackendAuthoritative(t *testing.T) {
	svc := NewService(&config.Config{}, nil, fakeMembershipReader{
		err: errors.NotFound("Membership", "athlete-1"),
	})

	_, err := svc.CreateMembershipPreference(context.Background(), "athlete-1")
	require.Error(t, err)
	appErr, ok := err.(*errors.AppError)
	require.True(t, ok)
	require.Equal(t, http.StatusNotFound, appErr.Status)
}

func TestCreateMembershipPreference_ZeroPrice_DoesNotCreateCheckout(t *testing.T) {
	svc := NewService(&config.Config{}, nil, fakeMembershipReader{
		m: &membership.Membership{ID: "m1", PlanName: "Plan", PlanPrice: 0},
	})

	_, err := svc.CreateMembershipPreference(context.Background(), "athlete-1")
	require.Error(t, err)
	appErr, ok := err.(*errors.AppError)
	require.True(t, ok)
	require.Equal(t, http.StatusBadRequest, appErr.Status)
}