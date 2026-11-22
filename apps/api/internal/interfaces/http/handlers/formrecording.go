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
	mediaapp "github.com/innotechlabs01/mr-training-api/internal/application/media"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// FormRecordingHandler handles HTTP requests for the form recording domain.
type FormRecordingHandler struct {
	service  *frapp.Service
	mediaSvc *mediaapp.Service
}

// NewFormRecordingHandler creates a new FormRecordingHandler.
func NewFormRecordingHandler(service *frapp.Service) *FormRecordingHandler {
	return &FormRecordingHandler{service: service}
}

// SetMediaService attaches the R2 media service for direct r2:// validation and streaming fallback.
func (h *FormRecordingHandler) SetMediaService(m *mediaapp.Service) *FormRecordingHandler {
	h.mediaSvc = m
	return h
}

// UploadRecording handles POST /form-recordings/upload.
// Primary path: JSON { exerciseId, workoutId, formScore, formMetrics, video_url: "r2://..." }.
// Legacy fallback: multipart form "file" streamed to R2 (or local disk when R2 is unconfigured).
func (h *FormRecordingHandler) UploadRecording(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	if strings.Contains(strings.ToLower(c.Get("Content-Type")), "application/json") {
		var body struct {
			ExerciseID  string          `json:"exerciseId"`
			WorkoutID   string          `json:"workoutId"`
			FormScore   float64         `json:"formScore"`
			FormMetrics json.RawMessage `json:"formMetrics"`
			VideoURL    string          `json:"video_url"`
		}
		if err := c.BodyParser(&body); err != nil {
			return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
		}
		if strings.TrimSpace(body.ExerciseID) == "" || strings.TrimSpace(body.VideoURL) == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "exerciseId and video_url are required")
		}
		var formMetricsStr string
		if len(body.FormMetrics) > 0 && string(body.FormMetrics) != "null" {
			var asStr string
			if err := json.Unmarshal(body.FormMetrics, &asStr); err == nil {
				formMetricsStr = asStr
			} else {
				formMetricsStr = string(body.FormMetrics)
			}
		}
		videoURL := strings.TrimSpace(body.VideoURL)
		if h.mediaSvc != nil && h.mediaSvc.Enabled() {
			normalized, err := h.mediaSvc.NormalizeAndValidateRef(c.Context(), actorFromCtx(c), videoURL)
			if err != nil {
				return mapMediaError(c, err)
			}
			videoURL = normalized
		}
		rec, err := h.service.Upload(c.Context(), userID, frapp.UploadInput{
			ExerciseID:  body.ExerciseID,
			WorkoutID:   body.WorkoutID,
			FormScore:   body.FormScore,
			FormMetrics: formMetricsStr,
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
			"created_at":  rec.CreatedAt,
		})
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

	var videoURL string
	if h.mediaSvc != nil && h.mediaSvc.Enabled() {
		src, err := file.Open()
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to open uploaded file")
		}
		defer src.Close()
		ct := file.Header.Get("Content-Type")
		if ct == "" {
			if ext == ".mov" {
				ct = "video/quicktime"
			} else {
				ct = "video/mp4"
			}
		}
		obj, err := h.mediaSvc.StoreStream(c.Context(), actorFromCtx(c), "form_recording", file.Filename, ct, file.Size, src)
		if err != nil {
			return mapMediaError(c, err)
		}
		videoURL = obj.Ref()
	} else {
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
		videoURL = "/uploads/form-recordings/" + filename
	}
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
