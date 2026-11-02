package subscription

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewSubscription(t *testing.T) {
	now := time.Now().UTC()
	sub, err := NewSubscription("sub_1", "athlete_1", "coach_1", "plan_1", "Plan Mensual", 49900, "COP", "monthly", 5)
	require.NoError(t, err)

	assert.Equal(t, "sub_1", sub.ID)
	assert.Equal(t, "athlete_1", sub.AthleteID)
	assert.Equal(t, "coach_1", sub.CoachID)
	assert.Equal(t, "plan_1", sub.PlanID)
	assert.Equal(t, StatusActive, sub.Status)
	assert.False(t, sub.CancelAtPeriodEnd)
	assert.Equal(t, float64(49900), sub.PlanPrice)
	assert.Equal(t, "COP", sub.Currency)
	assert.Equal(t, "monthly", sub.BillingPeriod)
	assert.Equal(t, 5, sub.GracePeriodDays)
	assert.True(t, sub.CurrentPeriodStart.After(now.Add(-time.Minute)))
	assert.True(t, sub.CurrentPeriodEnd.After(sub.CurrentPeriodStart))
	assert.Equal(t, 1, len(sub.DomainEvents()))
	assert.Equal(t, "subscription.created", sub.DomainEvents()[0].EventName())
}

func TestNewSubscriptionValidation(t *testing.T) {
	_, err := NewSubscription("sub_1", "", "coach_1", "plan_1", "Plan", 100, "COP", "monthly", 5)
	assert.ErrorContains(t, err, "athlete_id")

	_, err = NewSubscription("sub_1", "athlete_1", "", "plan_1", "Plan", 100, "COP", "monthly", 5)
	assert.ErrorContains(t, err, "coach_id")

	_, err = NewSubscription("sub_1", "athlete_1", "coach_1", "", "Plan", 100, "COP", "monthly", 5)
	assert.ErrorContains(t, err, "plan_id")

	_, err = NewSubscription("sub_1", "athlete_1", "coach_1", "plan_1", "Plan", 0, "COP", "monthly", 5)
	assert.Error(t, err)
}

func TestCancel(t *testing.T) {
	sub, err := NewSubscription("sub_1", "athlete_1", "coach_1", "plan_1", "Plan", 100, "COP", "monthly", 5)
	require.NoError(t, err)

	// Cancel once
	require.NoError(t, sub.Cancel())
	assert.True(t, sub.CancelAtPeriodEnd)
	assert.NotNil(t, sub.CanceledAt)
	assert.Equal(t, 2, len(sub.DomainEvents()))
	assert.Equal(t, "subscription.cancelled", sub.DomainEvents()[1].EventName())

	// Cancel again is idempotent-ish: returns ErrAlreadyCancelled
	err = sub.Cancel()
	assert.ErrorIs(t, err, ErrAlreadyCancelled)
}

func TestReactivate(t *testing.T) {
	sub, err := NewSubscription("sub_1", "athlete_1", "coach_1", "plan_1", "Plan", 100, "COP", "monthly", 5)
	require.NoError(t, err)

	// Cannot reactivate a non-cancelled subscription
	assert.ErrorIs(t, sub.Reactivate(), ErrNotCancelled)

	// Cancel then reactivate
	require.NoError(t, sub.Cancel())
	require.NoError(t, sub.Reactivate())
	assert.False(t, sub.CancelAtPeriodEnd)
	assert.Nil(t, sub.CanceledAt)
	assert.Equal(t, StatusActive, sub.Status)
	assert.Equal(t, "subscription.reactivated", sub.DomainEvents()[2].EventName())
}

func TestActivateAfterPayment(t *testing.T) {
	sub, err := NewSubscription("sub_1", "athlete_1", "coach_1", "plan_1", "Plan", 100, "COP", "monthly", 5)
	require.NoError(t, err)

	paymentID := "pay_123"
	now := time.Now().UTC()
	periodStart := now
	periodEnd := now.AddDate(0, 1, 0)

	require.NoError(t, sub.ActivateAfterPayment(paymentID, 100, periodStart, periodEnd))
	assert.Equal(t, StatusActive, sub.Status)
	assert.Equal(t, periodStart, sub.CurrentPeriodStart)
	assert.Equal(t, periodEnd, sub.CurrentPeriodEnd)
	assert.False(t, sub.CancelAtPeriodEnd)
	assert.Nil(t, sub.CanceledAt)
	// Payment due date extended by grace period from new period end
	assert.Equal(t, periodEnd.AddDate(0, 0, 5), sub.PaymentDueDate)

	assert.Equal(t, "subscription.paid", sub.DomainEvents()[1].EventName())
}

func TestActivateAfterPaymentValidation(t *testing.T) {
	sub, err := NewSubscription("sub_1", "athlete_1", "coach_1", "plan_1", "Plan", 100, "COP", "monthly", 5)
	require.NoError(t, err)

	err = sub.ActivateAfterPayment("", 100, time.Now(), time.Now().AddDate(0, 1, 0))
	assert.Error(t, err)

	err = sub.ActivateAfterPayment("pay_1", 0, time.Now(), time.Now().AddDate(0, 1, 0))
	assert.Error(t, err)

	// period_end before period_start
	err = sub.ActivateAfterPayment("pay_1", 100, time.Now().AddDate(0, 1, 0), time.Now())
	assert.Error(t, err)
}

func TestRecalculateStatus(t *testing.T) {
	now := time.Now().UTC().Truncate(24 * time.Hour)

	// Active: today within period
	sub := &Subscription{Status: StatusActive, CurrentPeriodEnd: now.AddDate(0, 0, 10), PaymentDueDate: now.AddDate(0, 0, 15)}
	sub.RecalculateStatus()
	assert.Equal(t, StatusActive, sub.Status)

	// Past due: period ended but within grace
	sub = &Subscription{Status: StatusActive, CurrentPeriodEnd: now.AddDate(0, 0, -1), PaymentDueDate: now.AddDate(0, 0, 3)}
	sub.RecalculateStatus()
	assert.Equal(t, StatusPastDue, sub.Status)

	// Expired: past due date
	sub = &Subscription{Status: StatusActive, CurrentPeriodEnd: now.AddDate(0, 0, -10), PaymentDueDate: now.AddDate(0, 0, -1)}
	sub.RecalculateStatus()
	assert.Equal(t, StatusExpired, sub.Status)

	// Cancelled is never auto-updated
	sub = &Subscription{Status: StatusCancelled, CurrentPeriodEnd: now.AddDate(0, 0, -10), PaymentDueDate: now.AddDate(0, 0, -1)}
	sub.RecalculateStatus()
	assert.Equal(t, StatusCancelled, sub.Status)
}
