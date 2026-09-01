// Package user defines the core user domain entities for the MR Training API.
// It includes User, Coach, and AthleteProfile types that map to the database schema.
package user

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

// Coach represents the extended profile for a coach user.
// It stores specialization, certifications, and capacity management.
type Coach struct {
	ID               string   `json:"id"`
	Email            string   `json:"email"`
	Name             string   `json:"name"`
	AvatarURL        string   `json:"avatar_url,omitempty"`
	Specializations  []string `json:"specializations"`
	Certifications   []string `json:"certifications"`
	Bio              string   `json:"bio,omitempty"`
	ExperienceYears  int      `json:"experience_years"`
	MaxAthletes      int      `json:"max_athletes"`
	IsAcceptingAthletes bool  `json:"is_accepting_athletes"`
	IsActive         bool     `json:"is_active"`
	CreatedAt        string   `json:"created_at"`
	UpdatedAt        string   `json:"updated_at"`
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

// CoachAthleteLink represents the relationship between a coach and an athlete.
// An athlete can have multiple coaches; each link tracks assignment status.
type CoachAthleteLink struct {
	CoachID    string `json:"coach_id"`
	AthleteID  string `json:"athlete_id"`
	AssignedAt string `json:"assigned_at"`
	IsPrimary  bool   `json:"is_primary"`
	Status     string `json:"status"` // "active", "inactive"
}
