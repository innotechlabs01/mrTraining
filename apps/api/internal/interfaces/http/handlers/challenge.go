package handlers

import (
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"

	app "github.com/innotechlabs01/mr-training-api/internal/application/challenge"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/challenge"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
)

// ChallengeHandler handles challenge HTTP requests.
type ChallengeHandler struct {
	service *app.Service
	hub     *websocket.Hub
}

// NewChallengeHandler creates a new handler.
func NewChallengeHandler(service *app.Service, hub *websocket.Hub) *ChallengeHandler {
	return &ChallengeHandler{service: service, hub: hub}
}

// --- Challenge CRUD (Coach) ---

// CreateChallenge handles POST /challenges.
func (h *ChallengeHandler) CreateChallenge(c *fiber.Ctx) error {
	coachID := c.Locals("userID").(string)

	var ch domain.Challenge
	if err := c.BodyParser(&ch); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	ch.CoachID = coachID
	if err := h.service.CreateChallenge(&ch); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": ch,
	})
}

// ListCoachChallenges handles GET /coach/challenges.
func (h *ChallengeHandler) ListCoachChallenges(c *fiber.Ctx) error {
	coachID := c.Locals("userID").(string)
	challenges, err := h.service.ListByCoach(coachID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list challenges",
		})
	}
	return c.JSON(fiber.Map{"data": challenges})
}

// ListDraftChallenges handles GET /coach/challenges/draft.
func (h *ChallengeHandler) ListDraftChallenges(c *fiber.Ctx) error {
	coachID := c.Locals("userID").(string)
	challenges, err := h.service.ListDraftByCoach(coachID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list draft challenges",
		})
	}
	return c.JSON(fiber.Map{"data": challenges})
}

// ListActiveChallengesByCoach handles GET /coach/challenges/active.
func (h *ChallengeHandler) ListActiveChallengesByCoach(c *fiber.Ctx) error {
	coachID := c.Locals("userID").(string)
	challenges, err := h.service.ListActiveByCoach(coachID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list active challenges",
		})
	}
	return c.JSON(fiber.Map{"data": challenges})
}

// GetChallenge handles GET /challenges/:id.
func (h *ChallengeHandler) GetChallenge(c *fiber.Ctx) error {
	id := c.Params("id")
	ch, err := h.service.GetChallenge(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Challenge not found",
		})
	}
	attempts, _ := h.service.ListAttempts(id)
	stats, _ := h.service.GetChallengeStats(id)
	leaderboard, _ := h.service.GetChallengeLeaderboard(id)

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"challenge":   ch,
			"attempts":    attempts,
			"stats":       stats,
			"leaderboard": leaderboard,
		},
	})
}

// UpdateChallenge handles PUT /challenges/:id.
func (h *ChallengeHandler) UpdateChallenge(c *fiber.Ctx) error {
	id := c.Params("id")
	var ch domain.Challenge
	if err := c.BodyParser(&ch); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	ch.ID = id
	if err := h.service.UpdateChallenge(&ch); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(fiber.Map{"success": true})
}

// DeleteChallenge handles DELETE /challenges/:id.
func (h *ChallengeHandler) DeleteChallenge(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.DeleteChallenge(id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(fiber.Map{"success": true})
}

// ActivateChallenge handles POST /challenges/:id/activate.
func (h *ChallengeHandler) ActivateChallenge(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.ActivateChallenge(id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(fiber.Map{"success": true})
}

// --- Athlete Endpoints ---

// ListAthleteChallenges handles GET /athlete/challenges.
func (h *ChallengeHandler) ListAthleteChallenges(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)
	challenges, err := h.service.ListActiveForAthlete(athleteID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list challenges",
		})
	}
	return c.JSON(fiber.Map{"data": challenges})
}

// GetActiveChallenge handles GET /athlete/challenges/active.
func (h *ChallengeHandler) GetActiveChallenge(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)
	challenge, err := h.service.GetActiveForAthlete(athleteID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get active challenge",
		})
	}
	return c.JSON(fiber.Map{"data": challenge})
}

// JoinChallenge handles POST /athlete/challenges/:id/join.
func (h *ChallengeHandler) JoinChallenge(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)
	challengeID := c.Params("id")

	var body struct {
		VideoConsent bool `json:"video_consent"`
		PhotoConsent bool `json:"photo_consent"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	attempt, err := h.service.JoinChallenge(challengeID, athleteID, body.VideoConsent, body.PhotoConsent)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": attempt})
}

// CreateAttempt handles POST /athlete/challenges/:id/attempts.
func (h *ChallengeHandler) CreateAttempt(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)
	challengeID := c.Params("id")

	attempt, err := h.service.JoinChallenge(challengeID, athleteID, false, false)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": attempt})
}

// SubmitAttempt handles POST /athlete/challenges/attempts/:id/submit.
func (h *ChallengeHandler) SubmitAttempt(c *fiber.Ctx) error {
	attemptID := c.Params("id")
	var metrics map[string]interface{}
	if err := c.BodyParser(&metrics); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	attempt, err := h.service.SubmitAttempt(attemptID, metrics)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to submit attempt",
		})
	}

	// Push the refreshed leaderboard to subscribers of this challenge.
	if h.hub != nil && attempt.ChallengeID != "" {
		leaderboard, lerr := h.service.GetChallengeLeaderboard(attempt.ChallengeID)
		if lerr == nil {
			h.hub.BroadcastToTopic("challenge:"+attempt.ChallengeID, websocket.Message{
				Type:    "challenge.leaderboard.updated",
				Payload: leaderboard,
			})
		}
	}

	return c.JSON(fiber.Map{"success": true})
}

// ListAthleteAttempts handles GET /athlete/challenges/:id/attempts.
func (h *ChallengeHandler) ListAthleteAttempts(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)
	attempts, err := h.service.ListAthleteAttempts(athleteID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list attempts",
		})
	}
	return c.JSON(fiber.Map{"data": attempts})
}

// UploadAttemptVideo handles POST /athlete/challenges/attempts/:id/video.
// Accepts a multipart form with a "file" field, stores it on disk, and
// attaches the resulting URL to the attempt.
func (h *ChallengeHandler) UploadAttemptVideo(c *fiber.Ctx) error {
	attemptID := c.Params("id")
	if attemptID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "attempt ID is required"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file is required"})
	}

	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".mp4"
	}

	filename := "challenge-" + attemptID + "-" + time.Now().UTC().Format("20060102150405") + ext
	dir := "uploads/challenges"
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create upload dir"})
	}

	dst := filepath.Join(dir, filename)
	if err := c.SaveFile(file, dst); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save file"})
	}

	videoURL := "/uploads/challenges/" + filename
	if _, err := h.service.AttachAttemptVideo(attemptID, videoURL); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"video_url": videoURL}})
}

// --- Leaderboard ---

// GetLeaderboard handles GET /challenges/:id/leaderboard.
func (h *ChallengeHandler) GetLeaderboard(c *fiber.Ctx) error {
	challengeID := c.Params("id")
	leaderboard, err := h.service.GetChallengeLeaderboard(challengeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get leaderboard",
		})
	}
	return c.JSON(fiber.Map{"data": leaderboard})
}

// --- Analytics ---

// GetChallengeStats handles GET /challenges/:id/stats.
func (h *ChallengeHandler) GetChallengeStats(c *fiber.Ctx) error {
	challengeID := c.Params("id")
	stats, err := h.service.GetChallengeStats(challengeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get stats",
		})
	}
	return c.JSON(fiber.Map{"data": stats})
}

// GetAthleteChallengeAnalytics handles GET /coach/athletes/:id/challenge-analytics.
func (h *ChallengeHandler) GetAthleteChallengeAnalytics(c *fiber.Ctx) error {
	athleteID := c.Params("id")
	analytics, err := h.service.GetAthleteChallengeAnalytics(athleteID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get analytics",
		})
	}
	return c.JSON(fiber.Map{"data": analytics})
}

// GetAthleteProgress handles GET /athlete/challenges/progress/:exerciseType.
func (h *ChallengeHandler) GetAthleteProgress(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)
	exerciseType := c.Params("exerciseType")
	progress, err := h.service.GetAthleteProgress(athleteID, exerciseType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get progress",
		})
	}
	return c.JSON(fiber.Map{"data": progress})
}
