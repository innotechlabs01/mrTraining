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

// ValidateCreateExercise validates a CreateExerciseRequest.
func ValidateCreateExercise(req *dto.CreateExerciseRequest) ValidationErrors {
	var errs ValidationErrors

	if strings.TrimSpace(req.Name) == "" {
		errs = append(errs, ValidationError{Field: "name", Message: "is required"})
	} else if len(req.Name) > 200 {
		errs = append(errs, ValidationError{Field: "name", Message: "must be at most 200 characters"})
	}

	if req.Mode != "" {
		switch req.Mode {
		case "reps", "time", "cardio":
			// valid
		default:
			errs = append(errs, ValidationError{
				Field:   "mode",
				Message: "must be one of: reps, time, cardio",
			})
		}
	}

	if req.Difficulty != "" {
		switch req.Difficulty {
		case "beginner", "intermediate", "advanced":
			// valid
		default:
			errs = append(errs, ValidationError{
				Field:   "difficulty",
				Message: "must be one of: beginner, intermediate, advanced",
			})
		}
	}

	if req.Category != "" {
		switch req.Category {
		case "compound", "isolation":
			// valid
		default:
			errs = append(errs, ValidationError{
				Field:   "category",
				Message: "must be one of: compound, isolation",
			})
		}
	}

	return errs
}

// ValidateCreateWorkoutTemplate validates a CreateWorkoutTemplateRequest.
func ValidateCreateWorkoutTemplate(req *dto.CreateWorkoutTemplateRequest) ValidationErrors {
	var errs ValidationErrors

	if strings.TrimSpace(req.Name) == "" {
		errs = append(errs, ValidationError{Field: "name", Message: "is required"})
	} else if len(req.Name) > 200 {
		errs = append(errs, ValidationError{Field: "name", Message: "must be at most 200 characters"})
	}

	for i, ex := range req.Exercises {
		if strings.TrimSpace(ex.Name) == "" {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("exercises[%d].name", i),
				Message: "is required",
			})
		}
		if ex.Sets < 1 {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("exercises[%d].sets", i),
				Message: "must be at least 1",
			})
		}
		if ex.Reps < 0 {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("exercises[%d].reps", i),
				Message: "must be non-negative",
			})
		}
	}

	return errs
}

// ValidateAssignWorkout validates an AssignWorkoutRequest.
func ValidateAssignWorkout(req *dto.AssignWorkoutRequest) ValidationErrors {
	var errs ValidationErrors

	if strings.TrimSpace(req.AthleteID) == "" {
		errs = append(errs, ValidationError{Field: "athlete_id", Message: "is required"})
	}

	if strings.TrimSpace(req.TemplateID) == "" {
		errs = append(errs, ValidationError{Field: "template_id", Message: "is required"})
	}

	if strings.TrimSpace(req.StartDate) == "" {
		errs = append(errs, ValidationError{Field: "start_date", Message: "is required"})
	}

	if strings.TrimSpace(req.EndDate) == "" {
		errs = append(errs, ValidationError{Field: "end_date", Message: "is required"})
	}

	return errs
}

// ValidateLogWorkoutSet validates a LogWorkoutSetRequest.
func ValidateLogWorkoutSet(req *dto.LogWorkoutSetRequest) ValidationErrors {
	var errs ValidationErrors

	if strings.TrimSpace(req.ExerciseID) == "" {
		errs = append(errs, ValidationError{Field: "exercise_id", Message: "is required"})
	}

	if req.SetIndex < 1 {
		errs = append(errs, ValidationError{Field: "set_index", Message: "must be at least 1"})
	}

	if req.RIR < 0 || req.RIR > 10 {
		errs = append(errs, ValidationError{Field: "rir", Message: "must be between 0 and 10"})
	}

	if req.RPE < 0 || req.RPE > 10 {
		errs = append(errs, ValidationError{Field: "rpe", Message: "must be between 0 and 10"})
	}

	return errs
}

// ValidateCreateMembership validates a CreateMembershipRequest.
func ValidateCreateMembership(req *dto.CreateMembershipRequest) ValidationErrors {
	var errs ValidationErrors

	if strings.TrimSpace(req.AthleteID) == "" {
		errs = append(errs, ValidationError{Field: "athlete_id", Message: "is required"})
	}

	if strings.TrimSpace(req.PlanName) == "" {
		errs = append(errs, ValidationError{Field: "plan_name", Message: "is required"})
	}

	if req.PlanPrice < 0 {
		errs = append(errs, ValidationError{Field: "plan_price", Message: "must be a non-negative number"})
	}

	if req.BillingPeriod != "" {
		switch req.BillingPeriod {
		case "monthly", "yearly":
			// valid
		default:
			errs = append(errs, ValidationError{
				Field:   "billing_period",
				Message: "must be one of: monthly, yearly",
			})
		}
	}

	return errs
}
