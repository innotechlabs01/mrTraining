package dto

// OnboardingRequest is the payload for saving onboarding data.
type OnboardingRequest struct {
	Sports                 []string `json:"sports"`
	Sport                  string   `json:"sport"`
	Modality               string   `json:"modality"`
	ExperienceLevel        string   `json:"experience_level"`
	Goal                   string   `json:"goal"`
	SessionsPerWeek        int      `json:"sessions_per_week"`
	SessionDuration        int      `json:"session_duration"`
	Equipment              string   `json:"equipment"`
	AthleteRoutineAccepted bool     `json:"athlete_routine_accepted"`
}

// OnboardingResponse represents onboarding data in API responses.
type OnboardingResponse struct {
	AthleteID              string   `json:"athlete_id"`
	Sports                 []string `json:"sports"`
	Modality               string   `json:"modality"`
	ExperienceLevel        string   `json:"experience_level"`
	Goal                   string   `json:"goal"`
	SessionsPerWeek        int      `json:"sessions_per_week"`
	SessionDuration        int      `json:"session_duration"`
	Equipment              string   `json:"equipment"`
	AthleteRoutineAccepted bool     `json:"athlete_routine_accepted"`
}
