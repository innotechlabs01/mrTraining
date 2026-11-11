package user

import (
	"context"
	"testing"

	userdomain "github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// mockMetadataWriter records the public metadata patches applied by the service.
type mockMetadataWriter struct {
	patches []map[string]interface{}
}

func (m *mockMetadataWriter) MergePublicMetadata(ctx context.Context, userID string, patch map[string]interface{}) error {
	m.patches = append(m.patches, patch)
	return nil
}

// activationRepository is a mockRepository specialised for the activation flow.
type activationRepository struct {
	mockRepository
	ensureUserCalls  []string
	ensureCoachCalls []string
	existingUser     *userdomain.User
	existingCoach    *userdomain.Coach
	savedCoach       *userdomain.Coach
}

func (r *activationRepository) GetByID(ctx context.Context, id string) (*userdomain.User, error) {
	if r.existingUser != nil {
		return r.existingUser, nil
	}
	return nil, errors.NotFound("User", id)
}

func (r *activationRepository) EnsureUser(ctx context.Context, id, email, name, role string) error {
	r.ensureUserCalls = append(r.ensureUserCalls, role)
	return nil
}

func (r *activationRepository) EnsureCoach(ctx context.Context, userID, email, name string) error {
	r.ensureCoachCalls = append(r.ensureCoachCalls, userID)
	return nil
}

func (r *activationRepository) GetCoach(ctx context.Context, userID string) (*userdomain.Coach, error) {
	if r.existingCoach != nil {
		return r.existingCoach, nil
	}
	return &userdomain.Coach{ID: userID, CoachCode: "MR-A7K2"}, nil
}

func (r *activationRepository) UpdateCoachOnboarding(ctx context.Context, userID string, coach *userdomain.Coach) error {
	r.savedCoach = coach
	return nil
}

func TestActivateCoach_NewUser_ProvisionsAndMirrorsPublicMetadata(t *testing.T) {
	repo := &activationRepository{}
	writer := &mockMetadataWriter{}
	svc := NewService(repo, nil).WithMetadataWriter(writer)

	result, err := svc.ActivateCoach(context.Background(), ActivateCommand{UserID: "user_1"})
	if err != nil {
		t.Fatalf("ActivateCoach failed: %v", err)
	}
	if !result.Created {
		t.Error("expected Created=true for a brand new account")
	}
	if result.CoachCode != "MR-A7K2" {
		t.Errorf("expected coach code MR-A7K2, got %q", result.CoachCode)
	}
	if len(repo.ensureUserCalls) != 1 || repo.ensureUserCalls[0] != "coach" {
		t.Errorf("expected the users row to be created with role coach, got %v", repo.ensureUserCalls)
	}
	if len(repo.ensureCoachCalls) != 1 {
		t.Errorf("expected the coaches row to be created once, got %v", repo.ensureCoachCalls)
	}
	if len(writer.patches) != 1 {
		t.Fatalf("expected 1 metadata patch, got %d", len(writer.patches))
	}
	patch := writer.patches[0]
	if patch["role"] != "coach" {
		t.Errorf("expected role coach in public metadata, got %v", patch["role"])
	}
	if patch["coachCode"] != "MR-A7K2" {
		t.Errorf("expected coachCode MR-A7K2 in public metadata, got %v", patch["coachCode"])
	}
}

func TestActivateCoach_ExistingAthlete_IsNeverPromotedToCoach(t *testing.T) {
	repo := &activationRepository{
		existingUser: &userdomain.User{ID: "user_1", Role: "athlete"},
	}
	writer := &mockMetadataWriter{}
	svc := NewService(repo, nil).WithMetadataWriter(writer)

	_, err := svc.ActivateCoach(context.Background(), ActivateCommand{UserID: "user_1"})
	if err == nil {
		t.Fatal("expected an error when activating an athlete account")
	}
	appErr, ok := err.(*errors.AppError)
	if !ok || appErr.Status != 409 {
		t.Fatalf("expected a 409 conflict, got %v", err)
	}
	if len(repo.ensureUserCalls) != 0 {
		t.Errorf("expected no user provisioning for an athlete, got %v", repo.ensureUserCalls)
	}
	if len(writer.patches) != 0 {
		t.Errorf("expected no metadata write for an athlete, got %v", writer.patches)
	}
}

func TestActivateCoach_ExistingCoach_IsIdempotent(t *testing.T) {
	repo := &activationRepository{
		existingUser:  &userdomain.User{ID: "user_1", Role: "coach"},
		existingCoach: &userdomain.Coach{ID: "user_1", CoachCode: "MR-ZZZZ"},
	}
	writer := &mockMetadataWriter{}
	svc := NewService(repo, nil).WithMetadataWriter(writer)

	result, err := svc.ActivateCoach(context.Background(), ActivateCommand{UserID: "user_1"})
	if err != nil {
		t.Fatalf("ActivateCoach failed: %v", err)
	}
	if result.Created {
		t.Error("expected Created=false for an already provisioned coach")
	}
	if result.CoachCode != "MR-ZZZZ" {
		t.Errorf("expected the existing coach code MR-ZZZZ, got %q", result.CoachCode)
	}
	if len(repo.ensureUserCalls) != 0 {
		t.Errorf("expected no user provisioning for an existing coach, got %v", repo.ensureUserCalls)
	}
}

func TestSaveCoachOnboarding_PersistsAnswers(t *testing.T) {
	repo := &activationRepository{
		existingCoach: &userdomain.Coach{ID: "user_1", CoachCode: "MR-A7K2"},
	}
	svc := NewService(repo, nil)

	coach, err := svc.SaveCoachOnboarding(context.Background(), "user_1", userdomain.CoachOnboarding{
		Sports:          []string{"Football", "Football", " "},
		Specializations: []string{"Strength & Conditioning"},
		ExperienceLevel: "advanced",
		TeamName:        "  Eagles  ",
		TeamSize:        0,
		AgeGroup:        "Collegiate",
		Certifications: []userdomain.Certification{
			{Name: "CSCS", Org: "NSCA"},
			{Name: "USATF Level 1"},
			{Name: "", Org: ""},
		},
	})
	if err != nil {
		t.Fatalf("SaveCoachOnboarding failed: %v", err)
	}
	if len(coach.Sports) != 1 || coach.Sports[0] != "Football" {
		t.Errorf("expected deduplicated trimmed sports, got %v", coach.Sports)
	}
	if coach.TeamName != "Eagles" {
		t.Errorf("expected trimmed team name, got %q", coach.TeamName)
	}
	if coach.TeamSize != 1 {
		t.Errorf("expected team size to default to 1, got %d", coach.TeamSize)
	}
	if len(coach.Certifications) != 2 {
		t.Fatalf("expected 2 certifications, got %v", coach.Certifications)
	}
	if coach.Certifications[0] != "CSCS (NSCA)" {
		t.Errorf("expected formatted certification, got %q", coach.Certifications[0])
	}
	if coach.Certifications[1] != "USATF Level 1" {
		t.Errorf("expected certification without org, got %q", coach.Certifications[1])
	}
	if repo.savedCoach == nil {
		t.Fatal("expected the onboarding answers to be persisted")
	}
}

func TestSaveCoachOnboarding_RejectsIncompleteAnswers(t *testing.T) {
	cases := []struct {
		name      string
		onboarding userdomain.CoachOnboarding
	}{
		{
			name: "no sports",
			onboarding: userdomain.CoachOnboarding{
				ExperienceLevel: "beginner", TeamName: "Eagles", AgeGroup: "Youth",
			},
		},
		{
			name: "invalid experience level",
			onboarding: userdomain.CoachOnboarding{
				Sports: []string{"Football"}, ExperienceLevel: "expert",
				TeamName: "Eagles", AgeGroup: "Youth",
			},
		},
		{
			name: "missing team name",
			onboarding: userdomain.CoachOnboarding{
				Sports: []string{"Football"}, ExperienceLevel: "beginner", AgeGroup: "Youth",
			},
		},
		{
			name: "missing age group",
			onboarding: userdomain.CoachOnboarding{
				Sports: []string{"Football"}, ExperienceLevel: "beginner", TeamName: "Eagles",
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &activationRepository{
				existingCoach: &userdomain.Coach{ID: "user_1", CoachCode: "MR-A7K2"},
			}
			svc := NewService(repo, nil)

			_, err := svc.SaveCoachOnboarding(context.Background(), "user_1", tc.onboarding)
			if err == nil {
				t.Fatal("expected a validation error")
			}
			appErr, ok := err.(*errors.AppError)
			if !ok || appErr.Status != 422 {
				t.Fatalf("expected a 422 validation error, got %v", err)
			}
			if repo.savedCoach != nil {
				t.Error("expected nothing to be persisted for an invalid onboarding")
			}
		})
	}
}
