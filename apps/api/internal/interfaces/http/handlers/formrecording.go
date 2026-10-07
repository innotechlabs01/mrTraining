package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	frapp "github.com/innotechlabs01/mr-training-api/internal/application/formrecording"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// FormRecordingHandler handles HTTP requests for the form recording domain.
type FormRecordingHandler struct {
	service *frapp.Service
}

// NewFormRecordingHandler creates a new FormRecordingHandler.
func NewFormRecordingHandler(service *frapp.Service) *FormRecordingHandler {
	return &FormRecordingHandler{service: service}
}

// UploadRecording handles POST /form-recordings/upload.
// Accepts a multipart form with a "file" field (video) plus metadata fields,
// stores the video on disk, and persists the recording metadata.
func (h *FormRecordingHandler) UploadRecording(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	file, err := c.FormFile("file")
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "file is required")
	}

	exerciseID := c.FormValue("exerciseId")
	if exerciseID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "exerciseId is required")
	}

	formScoreStr := c.FormValue("formScore")
	if formScoreStr == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "formScore is required")
	}
	formScore, err := strconv.ParseFloat(formScoreStr, 64)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "formScore must be a number")
	}

	formMetrics := c.FormValue("formMetrics")
	if formMetrics != "" {
		var raw json.RawMessage
		if err := json.Unmarshal([]byte(formMetrics), &raw); err != nil {
			return appresponse.Error(c, fiber.StatusBadRequest, "formMetrics must be valid JSON")
		}
	}

	workoutID := c.FormValue("workoutId")

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".mp4"
	}
	if ext != ".mp4" && ext != ".mov" {
		return appresponse.Error(c, fiber.StatusBadRequest, "unsupported file type: use .mp4 or .mov")
	}

	filename := "form-" + sanitizePathSegment(exerciseID) + "-" +
		time.Now().UTC().Format("20060102150405") + ext
	dir := "uploads/form-recordings"
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to create upload dir")
	}

	dst := filepath.Join(dir, filename)
	if err := c.SaveFile(file, dst); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to save file")
	}

	videoURL := "/uploads/form-recordings/" + filename
	rec, err := h.service.Upload(c.Context(), userID, frapp.UploadInput{
		ExerciseID:  exerciseID,
		WorkoutID:   workoutID,
		FormScore:   formScore,
		FormMetrics: formMetrics,
		VideoURL:    videoURL,
	})
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return appresponse.Success(c, fiber.Map{
		"id":          rec.ID,
		"video_url":   rec.VideoURL,
		"exercise_id": rec.ExerciseID,
		"form_score":  rec.FormScore,
	})
}

// sanitizePathSegment strips path traversal characters from user input
// before it is used inside a filename.
func sanitizePathSegment(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		}
	}
	if b.Len() == 0 {
		return "exercise"
	}
	return b.String()
}
