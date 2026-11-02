// Package onboarding defines the onboarding domain entities.
package onboarding

// OnboardingData holds the athlete's onboarding questionnaire answers.
type OnboardingData struct {
	AthleteID             string   `json:"athlete_id"`
	Sports                []string `json:"sports"`
	Modality              string   `json:"modality"`
	ExperienceLevel       string   `json:"experience_level"`
	Goal                  string   `json:"goal"`
	SessionsPerWeek       int      `json:"sessions_per_week"`
	SessionDuration       int      `json:"session_duration"`
	Equipment             string   `json:"equipment"`
	AthleteRoutineAccepted bool    `json:"athlete_routine_accepted"`
}
