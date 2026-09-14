package handlers

import (
	"github.com/gofiber/fiber/v2"

	app "github.com/innotechlabs01/mr-training-api/internal/application/routine"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/routine"
)

// RoutineHandler handles routine HTTP requests.
type RoutineHandler struct {
	service *app.Service
}

// NewRoutineHandler creates a new handler.
func NewRoutineHandler(service *app.Service) *RoutineHandler {
	return &RoutineHandler{service: service}
}

// ListRoutines returns all routines for the athlete.
func (h *RoutineHandler) ListRoutines(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)

	routines, err := h.service.ListRoutines(athleteID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list routines",
		})
	}

	return c.JSON(fiber.Map{
		"data": routines,
	})
}

// GetRoutine returns a routine by ID.
func (h *RoutineHandler) GetRoutine(c *fiber.Ctx) error {
	id := c.Params("id")

	routine, err := h.service.GetRoutine(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Routine not found",
		})
	}

	return c.JSON(fiber.Map{
		"data": routine,
	})
}

// CreateRoutine creates a new routine.
func (h *RoutineHandler) CreateRoutine(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)

	var routine domain.Routine
	if err := c.BodyParser(&routine); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	routine.AthleteID = athleteID
	if err := h.service.CreateRoutine(&routine); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create routine",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": routine,
	})
}

// UpdateRoutine updates an existing routine.
func (h *RoutineHandler) UpdateRoutine(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)
	id := c.Params("id")

	var routine domain.Routine
	if err := c.BodyParser(&routine); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	routine.ID = id
	routine.AthleteID = athleteID
	if err := h.service.UpdateRoutine(&routine); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update routine",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// DeleteRoutine deletes a routine.
func (h *RoutineHandler) DeleteRoutine(c *fiber.Ctx) error {
	athleteID := c.Locals("userID").(string)
	id := c.Params("id")

	if err := h.service.DeleteRoutine(id, athleteID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete routine",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
	})
}
