package user

import (
	"context"
	"testing"

	userdomain "github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// mockRepository implements user.Repository for testing.
type mockRepository struct {
	getByIDFn            func(ctx context.Context, id string) (*userdomain.User, error)
	getByEmailFn         func(ctx context.Context, email string) (*userdomain.User, error)
	createFn             func(ctx context.Context, user *userdomain.User) error
	updateFn             func(ctx context.Context, user *userdomain.User) error
	getCoachFn           func(ctx context.Context, userID string) (*userdomain.Coach, error)
	getAthleteProfileFn  func(ctx context.Context, userID string) (*userdomain.AthleteProfile, error)
	listCoachesFn         func(ctx context.Context) ([]*userdomain.Coach, error)
	listAthletesByCoachFn  func(ctx context.Context, coachID string) ([]*userdomain.AthleteProfile, error)
	updateAthleteProfileFn func(ctx context.Context, userID string, profile *userdomain.AthleteProfile) error
}

func (m *mockRepository) GetByID(ctx context.Context, id string) (*userdomain.User, error) {
	return m.getByIDFn(ctx, id)
}

func (m *mockRepository) GetByEmail(ctx context.Context, email string) (*userdomain.User, error) {
	return m.getByEmailFn(ctx, email)
}

func (m *mockRepository) Create(ctx context.Context, user *userdomain.User) error {
	return m.createFn(ctx, user)
}

func (m *mockRepository) Update(ctx context.Context, user *userdomain.User) error {
	return m.updateFn(ctx, user)
}

func (m *mockRepository) GetCoach(ctx context.Context, userID string) (*userdomain.Coach, error) {
	return m.getCoachFn(ctx, userID)
}

func (m *mockRepository) GetAthleteProfile(ctx context.Context, userID string) (*userdomain.AthleteProfile, error) {
	return m.getAthleteProfileFn(ctx, userID)
}

func (m *mockRepository) ListCoaches(ctx context.Context) ([]*userdomain.Coach, error) {
	return m.listCoachesFn(ctx)
}

func (m *mockRepository) ListAthletesByCoach(ctx context.Context, coachID string) ([]*userdomain.AthleteProfile, error) {
	return m.listAthletesByCoachFn(ctx, coachID)
}

func (m *mockRepository) UpdateAthleteProfile(ctx context.Context, userID string, profile *userdomain.AthleteProfile) error {
	return m.updateAthleteProfileFn(ctx, userID, profile)
}

func TestGetCurrentUser_Coach(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*userdomain.User, error) {
			return &userdomain.User{
				ID:    id,
				Email: "coach@example.com",
				Name:  "Jane Coach",
				Role:  "coach",
			}, nil
		},
		getCoachFn: func(ctx context.Context, userID string) (*userdomain.Coach, error) {
			return &userdomain.Coach{
				ID:               userID,
				Email:            "coach@example.com",
				Name:             "Jane Coach",
				Specializations:  []string{"strength", "conditioning"},
				ExperienceYears:  5,
				MaxAthletes:      20,
			}, nil
		},
	}

	svc := NewService(mock)
	u, coach, athlete, err := svc.GetCurrentUser(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if u.Role != "coach" {
		t.Errorf("expected role 'coach', got '%s'", u.Role)
	}
	if coach == nil {
		t.Fatal("expected coach profile, got nil")
	}
	if coach.ExperienceYears != 5 {
		t.Errorf("expected experience_years 5, got %d", coach.ExperienceYears)
	}
	if athlete != nil {
		t.Error("expected nil athlete profile for coach")
	}
}

func TestGetCurrentUser_Athlete(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*userdomain.User, error) {
			return &userdomain.User{
				ID:    id,
				Email: "athlete@example.com",
				Name:  "Tom Athlete",
				Role:  "athlete",
			}, nil
		},
		getAthleteProfileFn: func(ctx context.Context, userID string) (*userdomain.AthleteProfile, error) {
			return &userdomain.AthleteProfile{
				ID:              userID,
				Email:           "athlete@example.com",
				Name:            "Tom Athlete",
				Sport:           "crossfit",
				ExperienceLevel: "intermediate",
				HeightCm:        180,
				WeightKg:        82,
			}, nil
		},
	}

	svc := NewService(mock)
	u, coach, athlete, err := svc.GetCurrentUser(context.Background(), "user-2")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if u.Role != "athlete" {
		t.Errorf("expected role 'athlete', got '%s'", u.Role)
	}
	if coach != nil {
		t.Error("expected nil coach profile for athlete")
	}
	if athlete == nil {
		t.Fatal("expected athlete profile, got nil")
	}
	if athlete.Sport != "crossfit" {
		t.Errorf("expected sport 'crossfit', got '%s'", athlete.Sport)
	}
}

func TestGetCurrentUser_NotFound(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*userdomain.User, error) {
			return nil, errors.NotFound("User", id)
		},
	}

	svc := NewService(mock)
	_, _, _, err := svc.GetCurrentUser(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent user")
	}
}

func TestUpdateProfile_Success(t *testing.T) {
	var updatedName string
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*userdomain.User, error) {
			return &userdomain.User{ID: id, Name: "Old Name", Role: "athlete"}, nil
		},
		updateFn: func(ctx context.Context, user *userdomain.User) error {
			updatedName = user.Name
			return nil
		},
	}

	svc := NewService(mock)
	err := svc.UpdateProfile(context.Background(), "user-1", dto.UpdateProfileRequest{
		Name:      "New Name",
		AvatarURL: "https://example.com/avatar.jpg",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updatedName != "New Name" {
		t.Errorf("expected name 'New Name', got '%s'", updatedName)
	}
}

func TestUpdateProfile_UserNotFound(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*userdomain.User, error) {
			return nil, errors.NotFound("User", id)
		},
	}

	svc := NewService(mock)
	err := svc.UpdateProfile(context.Background(), "nonexistent", dto.UpdateProfileRequest{Name: "X"})
	if err == nil {
		t.Fatal("expected error for nonexistent user")
	}
}

func TestUpdateAthleteProfile_Success(t *testing.T) {
	var received *userdomain.AthleteProfile
	mock := &mockRepository{
		getAthleteProfileFn: func(ctx context.Context, userID string) (*userdomain.AthleteProfile, error) {
			return &userdomain.AthleteProfile{
				ID:    userID,
				Email: "athlete@example.com",
				Name:  "Tom Athlete",
			}, nil
		},
		updateAthleteProfileFn: func(ctx context.Context, userID string, profile *userdomain.AthleteProfile) error {
			received = profile
			return nil
		},
	}

	svc := NewService(mock)
	err := svc.UpdateAthleteProfile(context.Background(), "user-1", dto.UpdateAthleteRequest{
		EmergencyContact: "Mom",
		Modality:         "virtual",
		ScheduleDays:     "mon,wed,fri",
		ScheduleTime:     "08:00",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if received == nil {
		t.Fatal("expected repo to receive athlete profile, got nil")
	}
	if received.Modality != "virtual" {
		t.Errorf("expected modality 'virtual', got '%s'", received.Modality)
	}
	if received.ScheduleDays != "mon,wed,fri" {
		t.Errorf("expected schedule_days 'mon,wed,fri', got '%s'", received.ScheduleDays)
	}
	if received.ScheduleTime != "08:00" {
		t.Errorf("expected schedule_time '08:00', got '%s'", received.ScheduleTime)
	}
	if received.EmergencyContact != "Mom" {
		t.Errorf("expected emergency_contact 'Mom', got '%s'", received.EmergencyContact)
	}
}

func TestListCoaches_Pagination(t *testing.T) {
	coaches := make([]*userdomain.Coach, 25)
	for i := range coaches {
		coaches[i] = &userdomain.Coach{
			ID:   "coach-" + string(rune('A'+i)),
			Name: "Coach",
		}
	}

	mock := &mockRepository{
		listCoachesFn: func(ctx context.Context) ([]*userdomain.Coach, error) {
			return coaches, nil
		},
	}

	svc := NewService(mock)

	// Page 1, limit 10
	result, total, err := svc.ListCoaches(context.Background(), 1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 25 {
		t.Errorf("expected total 25, got %d", total)
	}
	if len(result) != 10 {
		t.Errorf("expected 10 coaches on page 1, got %d", len(result))
	}

	// Page 3, limit 10 (should get remaining 5)
	result, total, err = svc.ListCoaches(context.Background(), 3, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 25 {
		t.Errorf("expected total 25, got %d", total)
	}
	if len(result) != 5 {
		t.Errorf("expected 5 coaches on page 3, got %d", len(result))
	}
}

func TestListCoaches_Empty(t *testing.T) {
	mock := &mockRepository{
		listCoachesFn: func(ctx context.Context) ([]*userdomain.Coach, error) {
			return []*userdomain.Coach{}, nil
		},
	}

	svc := NewService(mock)
	result, total, err := svc.ListCoaches(context.Background(), 1, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 0 {
		t.Errorf("expected total 0, got %d", total)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 coaches, got %d", len(result))
	}
}

func TestGetUser_Success(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*userdomain.User, error) {
			return &userdomain.User{ID: id, Email: "test@example.com", Role: "athlete"}, nil
		},
	}

	svc := NewService(mock)
	u, err := svc.GetUser(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u.ID != "user-1" {
		t.Errorf("expected ID 'user-1', got '%s'", u.ID)
	}
}

func TestGetUser_NotFound(t *testing.T) {
	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, id string) (*userdomain.User, error) {
			return nil, errors.NotFound("User", id)
		},
	}

	svc := NewService(mock)
	_, err := svc.GetUser(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent user")
	}
}
