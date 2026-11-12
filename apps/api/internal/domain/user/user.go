// Package user defines the core user domain entities for the MR Training API.
// It includes User, Coach, and AthleteProfile types that map to the database schema.
// Entities enforce invariants through methods; fields are not mutated directly.
package user

import (
	"fmt"
	"strings"
)

// User represents a platform user. Clerk is the source of truth for identity;
// this entity stores application-specific attributes like role.
type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url,omitempty"`
	Role      string `json:"role"` // "coach" or "athlete"
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// RoleValue returns the user's role as a validated Role value object.
func (u *User) RoleValue() (Role, error) {
	return NewRole(u.Role)
}

// IsCoach returns true if the user's role is coach.
func (u *User) IsCoach() bool {
	r, err := NewRole(u.Role)
	return err == nil && r.IsCoach()
}

// IsAthlete returns true if the user's role is athlete.
func (u *User) IsAthlete() bool {
	r, err := NewRole(u.Role)
	return err == nil && r.IsAthlete()
}

// IsAdmin returns true if the user's role is admin.
func (u *User) IsAdmin() bool {
	r, err := NewRole(u.Role)
	return err == nil && r.IsAdmin()
}

// IsActive returns true if the user is active.
func (u *User) Active() bool {
	return u.IsActive
}

// UpdateName changes the user's display name. Name must be non-empty.
func (u *User) UpdateName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("name cannot be empty")
	}
	u.Name = name
	return nil
}

// UpdateAvatar changes the user's avatar URL.
func (u *User) UpdateAvatar(avatarURL string) {
	u.AvatarURL = avatarURL
}

// Coach represents the extended profile for a coach user.
// It stores specialization, certifications, and capacity management.
type Coach struct {
	ID               string   `json:"id"`
	Email            string   `json:"email"`
	Name             string   `json:"name"`
	AvatarURL        string   `json:"avatar_url,omitempty"`
	CoachCode        string   `json:"coach_code,omitempty"`
	Specializations  []string `json:"specializations"`
	Certifications   []string `json:"certifications"`
	Bio              string   `json:"bio,omitempty"`
	ExperienceYears  int      `json:"experience_years"`
	MaxAthletes      int      `json:"max_athletes"`
	IsAcceptingAthletes bool  `json:"is_accepting_athletes"`
	IsActive         bool     `json:"is_active"`
	CreatedAt        string   `json:"created_at"`
	UpdatedAt        string   `json:"updated_at"`

	// Onboarding answers collected by the coach activation flow.
	Sports          []string `json:"sports"`
	TeamName        string   `json:"team_name,omitempty"`
	TeamSize        int      `json:"team_size"`
	AgeGroup        string   `json:"age_group,omitempty"`
	ExperienceLevel string   `json:"experience_level,omitempty"`
}

// Experience levels accepted by the coach onboarding.
var coachExperienceLevels = map[string]bool{
	"beginner":     true,
	"intermediate": true,
	"advanced":     true,
	"elite":        true,
}

// CoachOnboarding holds the answers collected by the coach onboarding flow.
type CoachOnboarding struct {
	Sports          []string
	Specializations []string
	ExperienceLevel string
	TeamName        string
	TeamSize        int
	AgeGroup        string
	Certifications  []Certification
}

// Certification is a credential issued by an organization.
type Certification struct {
	Name string
	Org  string
}

// Display renders the certification for the coaches.certifications column,
// which the app reads as a flat list of strings.
func (c Certification) Display() string {
	name := strings.TrimSpace(c.Name)
	org := strings.TrimSpace(c.Org)
	switch {
	case name == "" && org == "":
		return ""
	case org == "":
		return name
	case name == "":
		return org
	default:
		return name + " (" + org + ")"
	}
}

// ApplyOnboarding validates the onboarding answers and applies them to the
// coach profile. It returns an error when a mandatory answer is missing so
// the profile is never persisted half-filled.
func (c *Coach) ApplyOnboarding(o CoachOnboarding) error {
	sports := cleanList(o.Sports)
	if len(sports) == 0 {
		return fmt.Errorf("at least one sport is required")
	}
	level := strings.TrimSpace(o.ExperienceLevel)
	if !coachExperienceLevels[level] {
		return fmt.Errorf("experience level must be one of beginner, intermediate, advanced, elite")
	}
	teamName := strings.TrimSpace(o.TeamName)
	if teamName == "" {
		return fmt.Errorf("team name is required")
	}
	teamSize := o.TeamSize
	if teamSize < 1 {
		teamSize = 1
	}
	ageGroup := strings.TrimSpace(o.AgeGroup)
	if ageGroup == "" {
		return fmt.Errorf("age group is required")
	}

	c.Sports = sports
	c.Specializations = cleanList(o.Specializations)
	c.Certifications = certificationDisplays(o.Certifications)
	c.ExperienceLevel = level
	c.TeamName = teamName
	c.TeamSize = teamSize
	c.AgeGroup = ageGroup
	return nil
}

// certificationDisplays flattens the certification list into the display
// strings stored on the coach profile.
func certificationDisplays(in []Certification) []string {
	out := make([]string, 0, len(in))
	for _, c := range in {
		if d := c.Display(); d != "" {
			out = append(out, d)
		}
	}
	return out
}

// cleanList trims every entry, drops the empty ones and removes duplicates
// while preserving the original order.
func cleanList(in []string) []string {
	out := make([]string, 0, len(in))
	seen := make(map[string]bool, len(in))
	for _, v := range in {
		v = strings.TrimSpace(v)
		if v == "" || seen[v] {
			continue
		}
		seen[v] = true
		out = append(out, v)
	}
	return out
}

// Active returns true if the coach profile is active.
func (c *Coach) Active() bool {
	return c.IsActive
}

// IsAccepting returns true if the coach is active and accepting new athletes.
func (c *Coach) IsAccepting() bool {
	return c.IsActive && c.IsAcceptingAthletes
}

// CanTakeMoreAthletes returns true if the coach has capacity for more athletes.
// currentCount is the number of currently assigned active athletes.
func (c *Coach) CanTakeMoreAthletes(currentCount int) bool {
	if !c.IsAccepting() {
		return false
	}
	if c.MaxAthletes <= 0 {
		return true // unlimited
	}
	return currentCount < c.MaxAthletes
}

// CoachCodeValue returns the coach code as a validated CoachCode value object.
func (c *Coach) CoachCodeValue() (CoachCode, error) {
	if c.CoachCode == "" {
		return "", fmt.Errorf("coach code is empty")
	}
	return NewCoachCode(c.CoachCode)
}

// AthleteProfile represents the extended profile for an athlete user.
// It stores physical attributes, sport, and emergency contact information.
type AthleteProfile struct {
	ID               string  `json:"id"`
	Email            string  `json:"email"`
	Name             string  `json:"name"`
	AvatarURL        string  `json:"avatar_url,omitempty"`
	Sport            string  `json:"sport,omitempty"`
	ExperienceLevel  string  `json:"experience_level,omitempty"` // "beginner", "intermediate", "advanced"
	HeightCm         float64 `json:"height_cm"`
	WeightKg         float64 `json:"weight_kg"`
	EmergencyContact string  `json:"emergency_contact,omitempty"`
	EmergencyPhone   string  `json:"emergency_phone,omitempty"`
	Modality         string  `json:"modality,omitempty"`
	ScheduleDays     string  `json:"schedule_days,omitempty"`
	ScheduleTime     string  `json:"schedule_time,omitempty"`
	IsActive         bool    `json:"is_active"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}

// Active returns true if the athlete profile is active.
func (ap *AthleteProfile) Active() bool {
	return ap.IsActive
}

// CoachAthleteLink represents the relationship between a coach and an athlete.
// An athlete can have multiple coaches; each link tracks assignment status.
type CoachAthleteLink struct {
	CoachID    string `json:"coach_id"`
	AthleteID  string `json:"athlete_id"`
	AssignedAt string `json:"assigned_at"`
	IsPrimary  bool   `json:"is_primary"`
	Status     string `json:"status"` // "active", "inactive"
}

// IsActive returns true if the coach-athlete link is active.
func (l *CoachAthleteLink) IsActive() bool {
	return l.Status == "active"
}
