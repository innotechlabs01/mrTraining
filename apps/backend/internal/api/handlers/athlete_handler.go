package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/mrtraining/backend/internal/athlete"
)

type AthleteHandler struct {
	uc       *athlete.UseCases
	orgIDKey string
	userIDKey string
}

func NewAthleteHandler(uc *athlete.UseCases) *AthleteHandler {
	return &AthleteHandler{
		uc:        uc,
		orgIDKey:  "org_id",
		userIDKey: "user_id",
	}
}

func (h *AthleteHandler) GetProfile(c *fiber.Ctx) error {
	ctx := c.UserContext()
	userID := c.Locals(h.userIDKey).(uuid.UUID)
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)
	coachID, _ := c.Locals("coach_id").(string)

	resp, err := h.uc.GetProfile(ctx, userID.String(), orgID.String(), coachID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(resp)
}

func (h *AthleteHandler) UpdateProfile(c *fiber.Ctx) error {
	ctx := c.UserContext()
	userID := c.Locals(h.userIDKey).(uuid.UUID)
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)
	coachID, _ := c.Locals("coach_id").(string)

	var cmd athlete.UpdateProfileCommand
	if err := c.BodyParser(&cmd); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	resp, err := h.uc.UpdateProfile(ctx, userID.String(), orgID.String(), cmd, coachID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(resp)
}
