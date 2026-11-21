package handlers

import (
	"database/sql"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	inviteapp "github.com/innotechlabs01/mr-training-api/internal/application/invite"
	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
	invitedomain "github.com/innotechlabs01/mr-training-api/internal/domain/invite"
	userinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/user"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// InviteHandler handles coach invitation HTTP requests.
type InviteHandler struct {
	service        *inviteapp.Service
	userService    *userapp.Service
	clerkSecretKey string
	clerkClient    *userinfra.ClerkClient
	db             *sql.DB
}

// NewInviteHandler creates a new InviteHandler.
func NewInviteHandler(service *inviteapp.Service, userService *userapp.Service, clerkSecretKey string, db ...*sql.DB) *InviteHandler {
	handler := &InviteHandler{
		service:        service,
		userService:    userService,
		clerkSecretKey: clerkSecretKey,
	}
	if len(db) > 0 {
		handler.db = db[0]
	}
	return handler
}

// AcceptInvite handles POST /invites/accept.
// Links the authenticated athlete to the coach referenced by the invite code.
func (h *InviteHandler) AcceptInvite(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.AcceptInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	result, err := h.service.AcceptInvite(middleware.RequestContext(c), req.Code, userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return appresponse.Success(c, result)
}

// ValidateInvite handles POST /invites/validate.
// Checks whether an invite code exists and is active without consuming it.
func (h *InviteHandler) ValidateInvite(c *fiber.Ctx) error {
	var req dto.ValidateInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	valid, err := h.service.ValidateCode(middleware.RequestContext(c), req.Code)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return appresponse.Success(c, dto.ValidateInviteResponse{Valid: valid, Code: req.Code})
}

// CoachInvite handles POST /coach/invite.
// Authenticated coach invites an athlete by email: verifies coach capacity,
// creates a Clerk invitation, and persists a pending invite record.
func (h *InviteHandler) CoachInvite(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	email := strings.TrimSpace(req.Email)
	if email == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "email is required")
	}

	// Verify the authenticated user is a coach and get their capacity.
	coach, err := h.userService.GetCoachByID(middleware.RequestContext(c), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, "coach not found")
	}

	// Count current athletes. The platform plan (when active) is the source
	// of truth for the athlete limit; fall back to the coach profile limit
	// only when the coach has no platform plan.
	if h.db != nil {
		capacity, capErr := middleware.GetCoachPlanCapacity(middleware.RequestContext(c), h.db, userID)
		if capErr == nil && capacity.MaxAthletes > 0 {
			if capacity.AthletesCount >= capacity.MaxAthletes {
				return appresponse.Error(c, fiber.StatusBadRequest,
					"límite de atletas del plan alcanzado — actualiza el plan para invitar más atletas")
			}
		} else {
			athletes, err := h.userService.GetAthletesByCoach(middleware.RequestContext(c), userID)
			if err != nil {
				return appresponse.Error(c, fiber.StatusInternalServerError, "failed to count athletes")
			}
			if len(athletes) >= coach.MaxAthletes {
				return appresponse.Error(c, fiber.StatusBadRequest, "max athletes reached")
			}
		}
	} else {
		athletes, err := h.userService.GetAthletesByCoach(middleware.RequestContext(c), userID)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to count athletes")
		}
		if len(athletes) >= coach.MaxAthletes {
			return appresponse.Error(c, fiber.StatusBadRequest, "max athletes reached")
		}
	}

	// Create the Clerk invitation using the shared resilient client.
	clerkInvID, err := h.clerkClientOrDefault().CreateInvitation(middleware.RequestContext(c), email, userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to create invitation")
	}

	// Persist the pending invite.
	expiresAt := time.Now().Add(7 * 24 * time.Hour).Format(time.RFC3339)
	if err := h.service.CreatePendingInvite(middleware.RequestContext(c), &invitedomain.PendingInvite{
		ID:                clerkInvID,
		CoachID:           userID,
		Email:             email,
		ClerkInvitationID: clerkInvID,
		Status:            "pending",
		ExpiresAt:         expiresAt,
		CreatedAt:         time.Now().Format(time.RFC3339),
	}); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to save invite")
	}

	return appresponse.Success(c, fiber.Map{
		"success":      true,
		"invitationId": clerkInvID,
		"email":        email,
	})
}

// WithClerkClient injects the shared Clerk API client.
func (h *InviteHandler) WithClerkClient(client *userinfra.ClerkClient) *InviteHandler {
	h.clerkClient = client
	return h
}

func (h *InviteHandler) clerkClientOrDefault() *userinfra.ClerkClient {
	if h.clerkClient != nil {
		return h.clerkClient
	}
	h.clerkClient = userinfra.NewClerkClient(h.clerkSecretKey)
	return h.clerkClient
}
