// Package handlers provides HTTP endpoint handlers. Handlers are thin
// translation layers: they parse requests, invoke use cases, and serialize
// responses. No business logic lives here.
package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"

	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
	"github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// coachActivator is the subset of the user application service used by the
// coach activation handler. It is an interface so the handler can be tested
// without a database.
type coachActivator interface {
	ActivateCoach(ctx context.Context, cmd userapp.ActivateCommand) (*userapp.ActivateResult, error)
	SaveCoachOnboarding(ctx context.Context, userID string, onboarding user.CoachOnboarding) (*user.Coach, error)
}

// CoachActivationHandler handles the coach activation and onboarding profile
// endpoints.
type CoachActivationHandler struct {
	svc coachActivator
}

// NewCoachActivationHandler creates a new coach activation handler.
func NewCoachActivationHandler(svc coachActivator) *CoachActivationHandler {
	return &CoachActivationHandler{svc: svc}
}

// RegisterCoachActivationRoutes mounts the coach activation endpoints on the
// auth-protected /api/v1 group.
//
// Both endpoints act on the AUTHENTICATED caller: no route accepts a target
// user id from the request body. That is what makes the role server
// authoritative — a client can only ever activate itself.
func (h *CoachActivationHandler) RegisterCoachActivationRoutes(api fiber.Router) {
	coaches := api.Group("/coach")
	coaches.Post("/activate", h.HandleActivate)
	coaches.Post("/onboard", h.HandleOnboard)
}

// HandleActivate handles POST /api/v1/coach/activate.
//
// It provisions the coach profile for the authenticated caller (users row,
// coaches row, coach code) and mirrors role + coach code into Clerk's PUBLIC
// metadata. It is idempotent: calling it twice returns the same coach code.
//
// The request carries no target user: the target is always the caller.
func (h *CoachActivationHandler) HandleActivate(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	result, err := h.svc.ActivateCoach(c.Context(), userapp.ActivateCommand{UserID: userID})
	if err != nil {
		return handleCoachActivationError(c, err)
	}

	// The role cache may still hold the pre-activation role for this user.
	// Drop it so the very next request resolves the fresh role.
	middleware.InvalidateRoleCache(userID)

	return appresponse.Success(c, dto.CoachActivateResponse{
		CoachID:   result.CoachID,
		CoachCode: result.CoachCode,
		Role:      "coach",
		Created:   result.Created,
	})
}

// HandleOnboard handles POST /api/v1/coach/onboard.
//
// It persists the answers collected by the coach onboarding flow. The target
// is always the authenticated caller.
func (h *CoachActivationHandler) HandleOnboard(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CoachOnboardingRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	certifications := make([]user.Certification, 0, len(req.Certifications))
	for _, cert := range req.Certifications {
		certifications = append(certifications, user.Certification{Name: cert.Name, Org: cert.Org})
	}

	coach, err := h.svc.SaveCoachOnboarding(c.Context(), userID, user.CoachOnboarding{
		Sports:          req.Sports,
		Specializations: req.Specializations,
		ExperienceLevel: req.ExperienceLevel,
		TeamName:        req.TeamName,
		TeamSize:        req.TeamSize,
		AgeGroup:        req.AgeGroup,
		Certifications:  certifications,
	})
	if err != nil {
		return handleCoachActivationError(c, err)
	}

	return appresponse.Success(c, dto.CoachOnboardingResponse{
		CoachID:         coach.ID,
		Sports:          coach.Sports,
		Specializations: coach.Specializations,
		Certifications:  coach.Certifications,
		ExperienceLevel: coach.ExperienceLevel,
		TeamName:        coach.TeamName,
		TeamSize:        coach.TeamSize,
		AgeGroup:        coach.AgeGroup,
	})
}

// handleCoachActivationError maps application errors to HTTP responses.
func handleCoachActivationError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
