// Package user defines the core user domain entities for the MR Training API.
// Value objects encapsulate validation and invariants for user attributes.
package user

import (
	"fmt"
	"regexp"
	"strings"
)

// Role is a validated user role value object.
// Valid roles: coach, athlete, admin.
type Role string

const (
	RoleCoach   Role = "coach"
	RoleAthlete Role = "athlete"
	RoleAdmin   Role = "admin"
)

// validRoles lists all permitted role values.
var validRoles = map[Role]struct{}{
	RoleCoach:   {},
	RoleAthlete: {},
	RoleAdmin:   {},
}

// NewRole validates and returns a Role.
func NewRole(s string) (Role, error) {
	r := Role(strings.TrimSpace(strings.ToLower(s)))
	if _, ok := validRoles[r]; !ok {
		return "", fmt.Errorf("invalid role: %q (must be coach, athlete, or admin)", s)
	}
	return r, nil
}

// IsCoach returns true if the role is coach.
func (r Role) IsCoach() bool { return r == RoleCoach }

// IsAthlete returns true if the role is athlete.
func (r Role) IsAthlete() bool { return r == RoleAthlete }

// IsAdmin returns true if the role is admin.
func (r Role) IsAdmin() bool { return r == RoleAdmin }

// String returns the role value.
func (r Role) String() string { return string(r) }

// Email is a validated email address value object.
type Email string

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`)

// NewEmail validates and returns an Email.
func NewEmail(s string) (Email, error) {
	e := Email(strings.TrimSpace(strings.ToLower(s)))
	if !emailRegex.MatchString(string(e)) {
		return "", fmt.Errorf("invalid email: %q", s)
	}
	return e, nil
}

// String returns the email value.
func (e Email) String() string { return string(e) }

// CoachCode is a validated coach invite code value object.
type CoachCode string

// NewCoachCode validates and returns a CoachCode.
// Codes are uppercase alphanumeric, 3-16 characters.
func NewCoachCode(s string) (CoachCode, error) {
	c := CoachCode(strings.TrimSpace(strings.ToUpper(s)))
	if len(c) < 3 || len(c) > 16 {
		return "", fmt.Errorf("coach code must be 3-16 characters, got %d", len(c))
	}
	for _, r := range c {
		if (r < '0' || r > '9') && (r < 'A' || r > 'Z') {
			return "", fmt.Errorf("coach code must be alphanumeric: %q", s)
		}
	}
	return c, nil
}

// String returns the coach code value.
func (c CoachCode) String() string { return string(c) }
