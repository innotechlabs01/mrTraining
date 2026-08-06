package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/mrtraining/backend/internal/coach"
	"github.com/mrtraining/backend/pkg/auth"
)

type CoachHandler struct {
	uc       *coach.UseCases
	orgIDKey string
	userIDKey string
}

func NewCoachHandler(uc *coach.UseCases) *CoachHandler {
	return &CoachHandler{
		uc:        uc,
		orgIDKey:  "org_id",
		userIDKey: "user_id",
	}
}

func (h *CoachHandler) GetProfile(c *fiber.Ctx) error {
	ctx := c.UserContext()
	userID := c.Locals(h.userIDKey).(uuid.UUID)
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)

	resp, err := h.uc.GetProfile(ctx, userID.String(), orgID.String())
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(resp)
}

func (h *CoachHandler) UpdateProfile(c *fiber.Ctx) error {
	ctx := c.UserContext()
	userID := c.Locals(h.userIDKey).(uuid.UUID)
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)

	var cmd coach.UpdateProfileCommand
	if err := c.BodyParser(&cmd); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	resp, err := h.uc.UpdateProfile(ctx, userID.String(), orgID.String(), cmd)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(resp)
}

func (h *CoachHandler) AssignAthlete(c *fiber.Ctx) error {
	ctx := c.UserContext()
	userID := c.Locals(h.userIDKey).(uuid.UUID)
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)

	var cmd coach.AssignAthleteCommand
	if err := c.BodyParser(&cmd); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if cmd.AthleteUserID != "" {
		cmd.AthleteUserID = auth.ClerkIDToInternal(cmd.AthleteUserID).String()
	}

	if err := h.uc.AssignAthlete(ctx, userID.String(), orgID.String(), cmd); err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "assigned"})
}

func (h *CoachHandler) ListAthletes(c *fiber.Ctx) error {
	ctx := c.UserContext()
	userID := c.Locals(h.userIDKey).(uuid.UUID)
	orgID := c.Locals(h.orgIDKey).(uuid.UUID)

	resp, err := h.uc.ListAthletes(ctx, userID.String(), orgID.String())
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(resp)
}
