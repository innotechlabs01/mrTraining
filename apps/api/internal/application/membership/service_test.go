package membership

import (
	"context"
	"testing"
	"time"

	domainmembership "github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	memorymembership "github.com/innotechlabs01/mr-training-api/internal/infrastructure/memory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestService_ListMembershipsByCoach(t *testing.T) {
	// Setup in-memory membership repository
	membershipRepo := memorymembership.NewInMemoryMembershipRepository()

	// Create memberships for coach-1
	membership1 := &domainmembership.Membership{
		ID:                 "membership-1",
		CoachID:            "coach-1",
		AthleteID:          "athlete-1",
		Status:             "active",
		PlanName:           "Plan Pro",
		PlanPrice:          10000,
		CurrentPeriodStart: "2024-01-01",
		CurrentPeriodEnd:   "2024-12-31",
	}
	require.NoError(t, membershipRepo.Create(context.Background(), membership1))

	membership2 := &domainmembership.Membership{
		ID:                 "membership-2",
		CoachID:            "coach-1",
		AthleteID:          "athlete-2",
		Status:             "active",
		PlanName:           "Plan Elite",
		PlanPrice:          20000,
		CurrentPeriodStart: "2024-01-01",
		CurrentPeriodEnd:   "2024-12-31",
	}
	require.NoError(t, membershipRepo.Create(context.Background(), membership2))

	// Create a membership for a different coach (should not be returned)
	membership3 := &domainmembership.Membership{
		ID:                 "membership-3",
		CoachID:            "coach-2",
		AthleteID:          "athlete-1",
		Status:             "active",
		PlanName:           "Plan Pro",
		PlanPrice:          15000,
		CurrentPeriodStart: "2024-01-01",
		CurrentPeriodEnd:   "2024-12-31",
	}
	require.NoError(t, membershipRepo.Create(context.Background(), membership3))

	// Create service with the repository that has data
	svc := NewService(membershipRepo)

	// Test the service
	memberships, err := svc.ListMembershipsByCoach(context.Background(), "coach-1")
	require.NoError(t, err)

	// Should return exactly 2 memberships for coach-1
	require.Len(t, memberships, 2, "Expected 2 memberships for coach-1")

	// Verify the memberships belong to coach-1
	for _, m := range memberships {
		assert.Equal(t, "coach-1", m.CoachID)
	}

	// Test with non-existent coach
	emptyMemberships, err := svc.ListMembershipsByCoach(context.Background(), "non-existent")
	require.NoError(t, err)
	assert.Empty(t, emptyMemberships)

	// Test with coach that has no memberships
	emptyRepo := memorymembership.NewInMemoryMembershipRepository()
	emptySvc := NewService(emptyRepo)
	emptyMemberships2, err := emptySvc.ListMembershipsByCoach(context.Background(), "coach-3")
	require.NoError(t, err)
	assert.Empty(t, emptyMemberships2)
}
func TestService_StartTrial_RequiresLinkedCoach(t *testing.T) {
	repo := memorymembership.NewInMemoryMembershipRepository()
	svc := NewService(repo)

	_, err := svc.StartTrial(context.Background(), "athlete-new", 7)
	require.Error(t, err)
}

func TestService_StartTrial_CreatesSevenDayTrial(t *testing.T) {
	repo := memorymembership.NewInMemoryMembershipRepository()
	ctx := context.Background()

	// Expired membership supplies the coach + plan context.
	expired := &domainmembership.Membership{
		ID:                 "old",
		CoachID:            "coach-1",
		AthleteID:          "athlete-1",
		Status:             "expired",
		PlanName:           "Plan Pro",
		PlanPrice:          10000,
		BillingPeriod:      "monthly",
		CurrentPeriodStart: "2025-01-01",
		CurrentPeriodEnd:   "2025-02-01",
		PaymentDueDate:     "2025-02-06",
	}
	require.NoError(t, repo.Create(ctx, expired))

	svc := NewService(repo)
	m, err := svc.StartTrial(ctx, "athlete-1", 7)
	require.NoError(t, err)
	assert.Equal(t, "trial", m.Status)
	assert.Equal(t, "coach-1", m.CoachID)
	assert.Equal(t, 0.0, m.PlanPrice)

	start, err := time.Parse("2006-01-02", m.CurrentPeriodStart)
	require.NoError(t, err)
	end, err := time.Parse("2006-01-02", m.CurrentPeriodEnd)
	require.NoError(t, err)
	assert.Equal(t, 7, int(end.Sub(start).Hours()/24))
}

func TestService_StartTrial_RejectsActiveMembership(t *testing.T) {
	repo := memorymembership.NewInMemoryMembershipRepository()
	ctx := context.Background()

	today := time.Now().UTC().Format("2006-01-02")
	future := time.Now().UTC().AddDate(0, 0, 20).Format("2006-01-02")
	active := &domainmembership.Membership{
		ID:                 "active-1",
		CoachID:            "coach-1",
		AthleteID:          "athlete-1",
		Status:             "active",
		PlanName:           "Plan Pro",
		CurrentPeriodStart: today,
		CurrentPeriodEnd:   future,
		PaymentDueDate:     future,
	}
	require.NoError(t, repo.Create(ctx, active))

	svc := NewService(repo)
	_, err := svc.StartTrial(ctx, "athlete-1", 7)
	require.Error(t, err)
}
