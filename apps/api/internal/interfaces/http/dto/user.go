package dto

// UpdateProfileRequest is the payload for updating the authenticated user's basic profile.
// Clerk is the source of truth for identity; this only updates app-specific fields.
type UpdateProfileRequest struct {
	// Name is the user's display name (2-100 characters).
	Name string `json:"name"`
	// AvatarURL is the URL to the user's profile image.
	AvatarURL string `json:"avatar_url"`
}

// UpdateCoachRequest is the payload for updating a coach's extended profile.
type UpdateCoachRequest struct {
	// Bio is the coach's biography (max 1000 characters).
	Bio string `json:"bio"`
	// Specializations is the list of sport specializations.
	Specializations []string `json:"specializations"`
	// Certifications is the list of coaching certifications.
	Certifications []string `json:"certifications"`
	// ExperienceYears is the number of years of coaching experience.
	ExperienceYears int `json:"experience_years"`
	// MaxAthletes is the maximum number of athletes the coach can accept (1-100).
	MaxAthletes int `json:"max_athletes"`
}

// UpdateAthleteRequest is the payload for updating an athlete's extended profile.
type UpdateAthleteRequest struct {
	// Sport is the athlete's primary sport (max 50 characters).
	Sport string `json:"sport"`
	// ExperienceLevel must be one of: "beginner", "intermediate", "advanced".
	ExperienceLevel string `json:"experience_level"`
	// HeightCm is the athlete's height in centimeters (50-250).
	HeightCm float64 `json:"height_cm"`
	// WeightKg is the athlete's weight in kilograms (20-300).
	WeightKg float64 `json:"weight_kg"`
	// EmergencyContact is the name of the emergency contact.
	EmergencyContact string `json:"emergency_contact"`
	// EmergencyPhone is the phone number of the emergency contact.
	EmergencyPhone string `json:"emergency_phone"`
	// Modality is the training mode: "virtual", "hibrido" or "presencial".
	Modality string `json:"modality"`
	// ScheduleDays is the comma-separated training days (e.g. "mon,wed,fri").
	ScheduleDays string `json:"schedule_days"`
	// ScheduleTime is the training time in HH:MM format.
	ScheduleTime string `json:"schedule_time"`
}

// UserResponse represents a user in API responses.
type UserResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url,omitempty"`
	Role      string `json:"role"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// CoachResponse represents a coach profile in API responses.
type CoachResponse struct {
	ID                  string   `json:"id"`
	Email               string   `json:"email"`
	Name                string   `json:"name"`
	AvatarURL           string   `json:"avatar_url,omitempty"`
	Bio                 string   `json:"bio,omitempty"`
	Specializations     []string `json:"specializations"`
	Certifications      []string `json:"certifications"`
	ExperienceYears     int      `json:"experience_years"`
	MaxAthletes         int      `json:"max_athletes"`
	IsAcceptingAthletes bool     `json:"is_accepting_athletes"`
	IsActive            bool     `json:"is_active"`
	CreatedAt           string   `json:"created_at"`
	UpdatedAt           string   `json:"updated_at"`
}

// AthleteProfileResponse represents an athlete profile in API responses.
type AthleteProfileResponse struct {
	ID               string  `json:"id"`
	Email            string  `json:"email"`
	Name             string  `json:"name"`
	AvatarURL        string  `json:"avatar_url,omitempty"`
	Sport            string  `json:"sport,omitempty"`
	ExperienceLevel  string  `json:"experience_level,omitempty"`
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

// ListResponse is a generic paginated list response.
type ListResponse[T any] struct {
	Data  []T   `json:"data"`
	Total int   `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
}

// CurrentUserResponse is the response for GET /users/me.
// It includes the base user profile and, when applicable, the role-specific profile.
type CurrentUserResponse struct {
	User             *UserResponse            `json:"user"`
	Coach            *CoachResponse           `json:"coach,omitempty"`
	AthleteProfile   *AthleteProfileResponse  `json:"athlete_profile,omitempty"`
}
