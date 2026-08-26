package membership

import (
	"context"
	"testing"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/membership"
)

// mockRepository is a simple in-memory implementation of membership.Repository for testing.
type mockRepository struct {
	memberships map[string]*domain.Membership
	payments    map[string]*domain.Payment
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		memberships: make(map[string]*domain.Membership),
		payments:    make(map[string]*domain.Payment),
	}
}

func (m *mockRepository) GetByAthleteID(_ context.Context, athleteID string) (*domain.Membership, error) {
	for _, mem := range m.memberships {
		if mem.AthleteID == athleteID {
			return mem, nil
		}
	}
	return nil, nil
}

func (m *mockRepository) GetByID(_ context.Context, id string) (*domain.Membership, error) {
	if mem, ok := m.memberships[id]; ok {
		return mem, nil
	}
	return nil, nil
}

func (m *mockRepository) Create(_ context.Context, mem *domain.Membership) error {
	m.memberships[mem.ID] = mem
	return nil
}

func (m *mockRepository) Update(_ context.Context, mem *domain.Membership) error {
	m.memberships[mem.ID] = mem
	return nil
}

func (m *mockRepository) Cancel(_ context.Context, id string) error {
	if mem, ok := m.memberships[id]; ok {
		mem.Status = "cancelled"
	}
	return nil
}

func (m *mockRepository) ListByCoach(_ context.Context, coachID string) ([]*domain.Membership, error) {
	var result []*domain.Membership
	for _, mem := range m.memberships {
		if mem.CoachID == coachID {
			result = append(result, mem)
		}
	}
	return result, nil
}

func (m *mockRepository) GetPaymentHistory(_ context.Context, athleteID string) ([]*domain.Payment, error) {
	var result []*domain.Payment
	for _, p := range m.payments {
		if p.MembershipID != "" {
			result = append(result, p)
		}
	}
	return result, nil
}

func (m *mockRepository) RecordPayment(_ context.Context, p *domain.Payment) error {
	m.payments[p.ID] = p
	return nil
}

func TestService_CreateMembership_Success(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	m, err := svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID:     "athlete-1",
		CoachID:       "coach-1",
		PlanName:      "Pro",
		PlanPrice:     29.99,
		BillingPeriod: "monthly",
		StartDate:     "2026-01-01",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if m.AthleteID != "athlete-1" {
		t.Errorf("expected athlete_id 'athlete-1', got '%s'", m.AthleteID)
	}
	if m.CoachID != "coach-1" {
		t.Errorf("expected coach_id 'coach-1', got '%s'", m.CoachID)
	}
	if m.Status != "active" {
		t.Errorf("expected status 'active', got '%s'", m.Status)
	}
	if m.CurrentPeriodEnd != "2026-02-01" {
		t.Errorf("expected period end '2026-02-01', got '%s'", m.CurrentPeriodEnd)
	}
	if m.GracePeriodDays != 5 {
		t.Errorf("expected grace_period_days 5, got %d", m.GracePeriodDays)
	}
}

func TestService_CreateMembership_Yearly(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	m, err := svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID:     "athlete-2",
		CoachID:       "coach-1",
		PlanName:      "Pro Yearly",
		PlanPrice:     299.99,
		BillingPeriod: "yearly",
		StartDate:     "2026-01-15",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if m.CurrentPeriodEnd != "2027-01-15" {
		t.Errorf("expected period end '2027-01-15', got '%s'", m.CurrentPeriodEnd)
	}
}

func TestService_CreateMembership_MissingAthleteID(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	_, err := svc.CreateMembership(context.Background(), CreateRequest{
		CoachID:  "coach-1",
		PlanName: "Pro",
	})
	if err == nil {
		t.Fatal("expected error for missing athlete_id")
	}
}

func TestService_CreateMembership_MissingCoachID(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	_, err := svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID: "athlete-1",
		PlanName:  "Pro",
	})
	if err == nil {
		t.Fatal("expected error for missing coach_id")
	}
}

func TestService_CreateMembership_MissingPlanName(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	_, err := svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID: "athlete-1",
		CoachID:   "coach-1",
	})
	if err == nil {
		t.Fatal("expected error for missing plan_name")
	}
}

func TestService_CreateMembership_DefaultBillingPeriod(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	m, err := svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID: "athlete-1",
		CoachID:   "coach-1",
		PlanName:  "Basic",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if m.BillingPeriod != "monthly" {
		t.Errorf("expected default billing_period 'monthly', got '%s'", m.BillingPeriod)
	}
}

func TestService_CancelMembership_Success(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	// Create first
	m, _ := svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID: "athlete-1",
		CoachID:   "coach-1",
		PlanName:  "Pro",
	})

	// Cancel
	err := svc.CancelMembership(context.Background(), m.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify
	cancelled, _ := svc.GetMembership(context.Background(), "athlete-1")
	if cancelled.Status != "cancelled" {
		t.Errorf("expected status 'cancelled', got '%s'", cancelled.Status)
	}
}

func TestService_RenewMembership_Success(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	// Create membership starting today so renewal extends into the future
	today := time.Now().UTC().Format("2006-01-02")
	m, _ := svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID:     "athlete-1",
		CoachID:       "coach-1",
		PlanName:      "Pro",
		BillingPeriod: "monthly",
		StartDate:     today,
	})

	// Renew
	err := svc.RenewMembership(context.Background(), m.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify the period was extended: start should be the original end,
	// end should be one month after that.
	start, _ := time.Parse("2006-01-02", today)
	originalEnd := start.AddDate(0, 1, 0)
	newEnd := originalEnd.AddDate(0, 1, 0)

	renewed, _ := repo.GetByID(context.Background(), m.ID)
	if renewed.CurrentPeriodStart != originalEnd.Format("2006-01-02") {
		t.Errorf("expected period start '%s', got '%s'", originalEnd.Format("2006-01-02"), renewed.CurrentPeriodStart)
	}
	if renewed.CurrentPeriodEnd != newEnd.Format("2006-01-02") {
		t.Errorf("expected period end '%s', got '%s'", newEnd.Format("2006-01-02"), renewed.CurrentPeriodEnd)
	}
	if renewed.Status != "active" {
		t.Errorf("expected status 'active', got '%s'", renewed.Status)
	}
}

func TestService_ListMembershipsByCoach(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	// Create memberships for different coaches
	svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID: "athlete-1",
		CoachID:   "coach-1",
		PlanName:  "Pro",
	})
	svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID: "athlete-2",
		CoachID:   "coach-1",
		PlanName:  "Basic",
	})
	svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID: "athlete-3",
		CoachID:   "coach-2",
		PlanName:  "Pro",
	})

	memberships, err := svc.ListMembershipsByCoach(context.Background(), "coach-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(memberships) != 2 {
		t.Errorf("expected 2 memberships for coach-1, got %d", len(memberships))
	}
}

func TestService_GetMembership_AutoStatusExpired(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	// Create membership that ended long ago
	startDate := time.Now().UTC().AddDate(0, -2, 0).Format("2006-01-02")

	svc.CreateMembership(context.Background(), CreateRequest{
		AthleteID:     "athlete-1",
		CoachID:       "coach-1",
		PlanName:      "Pro",
		BillingPeriod: "monthly",
		StartDate:     startDate,
	})

	// Manually set period end to the past
	mem, _ := repo.GetByAthleteID(context.Background(), "athlete-1")
	yesterday := time.Now().UTC().AddDate(0, 0, -10).Format("2006-01-02")
	mem.CurrentPeriodEnd = yesterday
	mem.PaymentDueDate = time.Now().UTC().AddDate(0, 0, -3).Format("2006-01-02")
	repo.Update(context.Background(), mem)

	// GetMembership should recalculate status to expired
	m, err := svc.GetMembership(context.Background(), "athlete-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if m.Status != "expired" {
		t.Errorf("expected status 'expired', got '%s'", m.Status)
	}
}
