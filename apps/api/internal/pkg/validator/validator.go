// Package validator provides input validation for MR Training API request payloads.
// It returns structured validation errors that map directly to HTTP 422 responses.
package validator

import (
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// ValidationError represents a single field validation failure.
type ValidationError struct {
	// Field is the name of the invalid request field.
	Field string
	// Message is a human-readable description of the validation rule.
	Message string
}

// Error returns a formatted string of all validation errors.
func (errs ValidationErrors) Error() string {
	var parts []string
	for _, e := range errs {
		parts = append(parts, fmt.Sprintf("%s: %s", e.Field, e.Message))
	}
	return strings.Join(parts, "; ")
}

// ValidationErrors is a collection of validation errors for a single request.
type ValidationErrors []ValidationError

// ValidateUpdateProfile validates an UpdateProfileRequest.
func ValidateUpdateProfile(req *dto.UpdateProfileRequest) ValidationErrors {
	var errs ValidationErrors

	if strings.TrimSpace(req.Name) == "" {
		errs = append(errs, ValidationError{Field: "name", Message: "is required"})
	} else if len(req.Name) < 2 || len(req.Name) > 100 {
		errs = append(errs, ValidationError{Field: "name", Message: "must be between 2 and 100 characters"})
	}

	return errs
}

// ValidateUpdateCoach validates an UpdateCoachRequest.
func ValidateUpdateCoach(req *dto.UpdateCoachRequest) ValidationErrors {
	var errs ValidationErrors

	if req.MaxAthletes < 1 || req.MaxAthletes > 100 {
		errs = append(errs, ValidationError{Field: "max_athletes", Message: "must be between 1 and 100"})
	}

	if req.ExperienceYears < 0 {
		errs = append(errs, ValidationError{Field: "experience_years", Message: "must be a non-negative number"})
	}

	return errs
}

// ValidateUpdateAthlete validates an UpdateAthleteRequest.
func ValidateUpdateAthlete(req *dto.UpdateAthleteRequest) ValidationErrors {
	var errs ValidationErrors

	if req.Sport != "" && len(req.Sport) > 50 {
		errs = append(errs, ValidationError{Field: "sport", Message: "must be at most 50 characters"})
	}

	if req.ExperienceLevel != "" {
		switch req.ExperienceLevel {
		case "beginner", "intermediate", "advanced":
			// valid
		default:
			errs = append(errs, ValidationError{
				Field:   "experience_level",
				Message: "must be one of: beginner, intermediate, advanced",
			})
		}
	}

	if req.HeightCm != 0 && (req.HeightCm < 50 || req.HeightCm > 250) {
		errs = append(errs, ValidationError{Field: "height_cm", Message: "must be between 50 and 250"})
	}

	if req.WeightKg != 0 && (req.WeightKg < 20 || req.WeightKg > 300) {
		errs = append(errs, ValidationError{Field: "weight_kg", Message: "must be between 20 and 300"})
	}

	return errs
}
