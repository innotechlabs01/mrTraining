package validator

import (
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

func strPtr(s string) *string { return &s }

// Video URL must be an absolute http(s) URL with a host (security: no
// javascript:/file:/malformed values can be stored as exercise media).
func TestValidateCreateExerciseVideoURL(t *testing.T) {
	base := dto.CreateExerciseRequest{Name: "Bench Press"}

	valid := base
	valid.VideoURL = "https://cdn.example.com/video.mp4"
	if errs := ValidateCreateExercise(&valid); len(errs) != 0 {
		t.Errorf("valid videoUrl must pass, got %v", errs)
	}

	// Empty stays valid (field is optional).
	if errs := ValidateCreateExercise(&base); len(errs) != 0 {
		t.Errorf("empty videoUrl must pass, got %v", errs)
	}

	invalid := base
	invalid.VideoURL = "javascript:alert(1)"
	if errs := ValidateCreateExercise(&invalid); len(errs) == 0 {
		t.Error("javascript: URL must be rejected")
	}

	invalid.VideoURL = "not-a-url"
	if errs := ValidateCreateExercise(&invalid); len(errs) == 0 {
		t.Error("relative URL must be rejected")
	}
}

func TestValidateUpdateExerciseVideoURL(t *testing.T) {
	valid := dto.UpdateExerciseRequest{VideoURL: strPtr("https://cdn.example.com/v.mp4")}
	if errs := ValidateUpdateExercise(&valid); len(errs) != 0 {
		t.Errorf("valid videoUrl must pass, got %v", errs)
	}

	// Explicit empty string clears the video — must stay valid.
	empty := dto.UpdateExerciseRequest{VideoURL: strPtr("")}
	if errs := ValidateUpdateExercise(&empty); len(errs) != 0 {
		t.Errorf("empty videoUrl must pass, got %v", errs)
	}

	invalid := dto.UpdateExerciseRequest{VideoURL: strPtr("ftp://host/x.mp4")}
	if errs := ValidateUpdateExercise(&invalid); len(errs) == 0 {
		t.Error("ftp:// URL must be rejected")
	}
}
