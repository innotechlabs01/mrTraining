package user

import (
	"strings"
	"testing"
)

func TestNewRole(t *testing.T) {
	cases := []struct {
		input string
		want  Role
		ok    bool
	}{
		{"coach", RoleCoach, true},
		{"athlete", RoleAthlete, true},
		{"admin", RoleAdmin, true},
		{"COACH", RoleCoach, true},
		{"  athlete  ", RoleAthlete, true},
		{"owner", "", false},
		{"", "", false},
	}
	for _, c := range cases {
		got, err := NewRole(c.input)
		if c.ok {
			if err != nil {
				t.Errorf("NewRole(%q) unexpected error: %v", c.input, err)
			}
			if got != c.want {
				t.Errorf("NewRole(%q) = %q, want %q", c.input, got, c.want)
			}
		} else {
			if err == nil {
				t.Errorf("NewRole(%q) expected error, got %q", c.input, got)
			}
		}
	}
}

func TestRole_IsCoach_IsAthlete_IsAdmin(t *testing.T) {
	if !RoleCoach.IsCoach() || RoleCoach.IsAthlete() || RoleCoach.IsAdmin() {
		t.Error("RoleCoach mismatch")
	}
	if !RoleAthlete.IsAthlete() || RoleAthlete.IsCoach() || RoleAthlete.IsAdmin() {
		t.Error("RoleAthlete mismatch")
	}
	if !RoleAdmin.IsAdmin() || RoleAdmin.IsCoach() || RoleAdmin.IsAthlete() {
		t.Error("RoleAdmin mismatch")
	}
}

func TestNewEmail(t *testing.T) {
	cases := []struct {
		input string
		ok    bool
	}{
		{"coach@example.com", true},
		{"ATHLETE@Example.COM", true},
		{"user+tag@domain.co.uk", true},
		{"not-an-email", false},
		{"@domain.com", false},
		{"user@", false},
		{"", false},
	}
	for _, c := range cases {
		_, err := NewEmail(c.input)
		if c.ok && err != nil {
			t.Errorf("NewEmail(%q) unexpected error: %v", c.input, err)
		}
		if !c.ok && err == nil {
			t.Errorf("NewEmail(%q) expected error", c.input)
		}
	}
}

func TestNewCoachCode(t *testing.T) {
	cases := []struct {
		input string
		ok    bool
	}{
		{"ABC123", true},
		{"XYZ", true},
		{"abc123", true}, // lowercased to upper
		{"AB", false},    // too short
		{"TOOLONGCODE123456", false}, // 17 chars, too long
		{"ABC-123", false}, // invalid char
		{"", false},
	}
	for _, c := range cases {
		got, err := NewCoachCode(c.input)
		if c.ok {
			if err != nil {
				t.Errorf("NewCoachCode(%q) unexpected error: %v", c.input, err)
			}
			if got.String() != strings.ToUpper(c.input) {
				t.Errorf("NewCoachCode(%q) = %q, want %q", c.input, got, stringsUpper(c.input))
			}
		} else {
			if err == nil {
				t.Errorf("NewCoachCode(%q) expected error", c.input)
			}
		}
	}
}

func stringsUpper(s string) string {
	out := make([]rune, 0, len(s))
	for _, r := range s {
		if r >= 'a' && r <= 'z' {
			r -= 32
		}
		out = append(out, r)
	}
	return string(out)
}

func TestUserMethods(t *testing.T) {
	u := &User{Role: "coach", IsActive: true, Name: "Jane"}
	if !u.IsCoach() || u.IsAthlete() || u.IsAdmin() {
		t.Error("User role methods mismatch")
	}
	if !u.Active() {
		t.Error("User.Active() should be true")
	}
	if err := u.UpdateName(""); err == nil {
		t.Error("UpdateName empty should error")
	}
	if err := u.UpdateName("John"); err != nil {
		t.Errorf("UpdateName John: %v", err)
	}
	if u.Name != "John" {
		t.Error("name not updated")
	}
}

func TestCoachMethods(t *testing.T) {
	c := &Coach{IsActive: true, IsAcceptingAthletes: true, MaxAthletes: 10}
	if !c.Active() || !c.IsAccepting() || !c.CanTakeMoreAthletes(5) {
		t.Error("Coach capacity mismatch")
	}
	if c.CanTakeMoreAthletes(10) || c.CanTakeMoreAthletes(11) {
		t.Error("Coach at capacity should not take more")
	}
	c2 := &Coach{IsActive: true, IsAcceptingAthletes: false, MaxAthletes: 100}
	if c2.IsAccepting() || c2.CanTakeMoreAthletes(0) {
		t.Error("Coach not accepting should not take more")
	}
	c3 := &Coach{IsActive: true, IsAcceptingAthletes: true, MaxAthletes: 0}
	if !c3.CanTakeMoreAthletes(999) {
		t.Error("Unlimited coach should take more")
	}
}

func TestAthleteProfileMethods(t *testing.T) {
	ap := &AthleteProfile{IsActive: true}
	if !ap.Active() {
		t.Error("AthleteProfile.Active() should be true")
	}
	ap2 := &AthleteProfile{IsActive: false}
	if ap2.Active() {
		t.Error("inactive athlete should not be active")
	}
}

func TestCoachAthleteLinkMethods(t *testing.T) {
	l := &CoachAthleteLink{Status: "active"}
	if !l.IsActive() {
		t.Error("active link should be active")
	}
	l2 := &CoachAthleteLink{Status: "inactive"}
	if l2.IsActive() {
		t.Error("inactive link should not be active")
	}
}
