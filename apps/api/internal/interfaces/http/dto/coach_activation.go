package dto

// CoachActivateRequest is the payload for activating a coach account.
//
// The target user is ALWAYS the authenticated caller: the request carries no
// user id, so a client cannot provision a coach profile for somebody else.
type CoachActivateRequest struct {
	// PlanID is the platform plan the coach is activating. Optional: the
	// checkout is a separate call, but keeping it here lets the API validate
	// the plan exists and is active.
	PlanID string `json:"plan_id"`
}

// CoachActivateResponse is the result of a coach activation.
type CoachActivateResponse struct {
	CoachID   string `json:"coach_id"`
	CoachCode string `json:"coach_code"`
	Role      string `json:"role"`
	// Created is true when this call provisioned the coach profile.
	Created bool `json:"created"`
}

// CertificationInput is a credential issued by an organization, as collected
// by the coach onboarding.
type CertificationInput struct {
	// Name is the certification name (e.g. "CSCS").
	Name string `json:"name"`
	// Org is the issuing organization (e.g. "NSCA").
	Org string `json:"org"`
}

// CoachOnboardingRequest is the payload with the answers collected by the
// coach onboarding flow.
type CoachOnboardingRequest struct {
	// Sports are the sports the coach works with (at least one).
	Sports []string `json:"sports"`
	// Specializations are the coaching specializations.
	Specializations []string `json:"specializations"`
	// ExperienceLevel is one of: beginner, intermediate, advanced, elite.
	ExperienceLevel string `json:"experience_level"`
	// TeamName is the default team or program name.
	TeamName string `json:"team_name"`
	// TeamSize is the number of athletes in the default team (min 1).
	TeamSize int `json:"team_size"`
	// AgeGroup is the default age group of the athletes.
	AgeGroup string `json:"age_group"`
	// Certifications are the credentials, each with a name and an issuer.
	Certifications []CertificationInput `json:"certifications"`
}

// CoachOnboardingResponse is the saved coach profile after the onboarding.
type CoachOnboardingResponse struct {
	CoachID         string   `json:"coach_id"`
	Sports          []string `json:"sports"`
	Specializations []string `json:"specializations"`
	Certifications  []string `json:"certifications"`
	ExperienceLevel string   `json:"experience_level"`
	TeamName        string   `json:"team_name"`
	TeamSize        int      `json:"team_size"`
	AgeGroup        string   `json:"age_group"`
}
