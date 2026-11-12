package invite

import (
	"context"
	"testing"
)

// The invite IS the coach: the coach code is the invite code. This test
// guards the query, which used to read a `user_id` column that the coaches
// table does not have — making every athlete sign-up with a coach code fail
// with "column user_id does not exist".
func TestGetByCode_ResolvesTheCoachFromTheCoachCode(t *testing.T) {
	repo, coachID, code, cleanup := newCoachFixture(t)
	defer cleanup()

	inv, err := repo.GetByCode(context.Background(), code)
	if err != nil {
		t.Fatalf("GetByCode failed: %v", err)
	}
	if inv.CoachID != coachID {
		t.Errorf("expected the coach id, got %q", inv.CoachID)
	}
	if inv.Code != code {
		t.Errorf("expected the normalized coach code, got %q", inv.Code)
	}
	if inv.Status != "active" {
		t.Errorf("expected an active invite, got %q", inv.Status)
	}
}

func TestGetByCode_UnknownCode(t *testing.T) {
	repo, _, _, cleanup := newCoachFixture(t)
	defer cleanup()

	if _, err := repo.GetByCode(context.Background(), "MR-NOPE"); err == nil {
		t.Fatal("expected an error for an unknown coach code")
	}
}

func TestValidateCode(t *testing.T) {
	repo, _, code, cleanup := newCoachFixture(t)
	defer cleanup()

	valid, err := repo.ValidateCode(context.Background(), code)
	if err != nil {
		t.Fatalf("ValidateCode failed: %v", err)
	}
	if !valid {
		t.Error("expected the coach code to be valid")
	}
}
