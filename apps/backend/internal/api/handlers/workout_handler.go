package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/mrtraining/backend/internal/training"
	"github.com/mrtraining/backend/pkg/apperror"
)

type WorkoutHandler struct {
	uc        *training.UseCases
	orgIDKey  string
	userIDKey string
}

func NewWorkoutHandler(uc *training.UseCases) *WorkoutHandler {
	return &WorkoutHandler{
		uc:        uc,
		orgIDKey:  "org_id",
		userIDKey: "user_id",
	}
}

func (h *WorkoutHandler) CreateWorkout(c *fiber.Ctx) error {
	ctx := c.UserContext()
	coachID := c.Locals(h.userIDKey).(uuid.UUID)
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)

	var cmd training.CreateWorkoutCommand
	if err := c.BodyParser(&cmd); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	resp, err := h.uc.CreateWorkout(ctx, cmd, coachID, orgID)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *WorkoutHandler) GetWorkout(c *fiber.Ctx) error {
	ctx := c.UserContext()
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)
	workoutID := c.Params("id")

	resp, err := h.uc.GetWorkout(ctx, workoutID, orgID.String())
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(resp)
}

func (h *WorkoutHandler) CompleteWorkout(c *fiber.Ctx) error {
	ctx := c.UserContext()
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)
	workoutID := c.Params("id")

	var req struct {
		RPE   int    `json:"rpe"`
		Notes string `json:"notes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	resp, err := h.uc.CompleteWorkout(ctx, workoutID, orgID.String(), req.RPE, req.Notes)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(resp)
}

func (h *WorkoutHandler) ListAthleteWorkouts(c *fiber.Ctx) error {
	ctx := c.UserContext()
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)
	athleteID := c.Params("athleteId")
	dateFrom := c.Query("dateFrom")
	dateTo := c.Query("dateTo")

	if dateFrom == "" {
		dateFrom = time.Now().AddDate(0, -3, 0).Format("2006-01-02")
	}
	if dateTo == "" {
		dateTo = time.Now().Format("2006-01-02")
	}

	workouts, err := h.uc.GetAthleteWorkouts(ctx, athleteID, orgID.String(), dateFrom, dateTo)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(workouts)
}

func (h *WorkoutHandler) GetTodayWorkout(c *fiber.Ctx) error {
	ctx := c.UserContext()
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)
	athleteID := c.Params("athleteId")

	workouts, err := h.uc.GetAthleteWorkouts(ctx, athleteID, orgID.String(), "", "")
	if err != nil {
		return handleError(c, err)
	}

	today := time.Now().Format("2006-01-02")
	for _, w := range workouts {
		if w.ScheduledDate == today {
			return c.JSON(w)
		}
	}

	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no workout scheduled for today"})
}

func (h *WorkoutHandler) ListPendingReviews(c *fiber.Ctx) error {
	ctx := c.UserContext()
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)
	coachID := c.Locals(h.userIDKey).(uuid.UUID)

	workouts, err := h.uc.GetPendingReviews(ctx, coachID, orgID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(workouts)
}

func handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperror.Error); ok {
		statusCode := fiber.StatusInternalServerError
		switch appErr.Code {
		case apperror.CodeInvalidInput:
			statusCode = fiber.StatusBadRequest
		case apperror.CodeNotFound:
			statusCode = fiber.StatusNotFound
		case apperror.CodeUnauthorized:
			statusCode = fiber.StatusUnauthorized
		case apperror.CodeForbidden:
			statusCode = fiber.StatusForbidden
		case apperror.CodeConflict:
			statusCode = fiber.StatusConflict
		}
		return c.Status(statusCode).JSON(fiber.Map{"error": appErr.Message, "code": string(appErr.Code)})
	}
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
}
