package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	invitedomain "github.com/innotechlabs01/mr-training-api/internal/domain/invite"
	inviteapp "github.com/innotechlabs01/mr-training-api/internal/application/invite"
	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// InviteHandler handles coach invitation HTTP requests.
type InviteHandler struct {
	service       *inviteapp.Service
	userService   *userapp.Service
	clerkSecretKey string
}

// NewInviteHandler creates a new InviteHandler.
func NewInviteHandler(service *inviteapp.Service, userService *userapp.Service, clerkSecretKey string) *InviteHandler {
	return &InviteHandler{
		service:        service,
		userService:    userService,
		clerkSecretKey: clerkSecretKey,
	}
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

	result, err := h.service.AcceptInvite(c.Context(), req.Code, userID)
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

	valid, err := h.service.ValidateCode(c.Context(), req.Code)
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
	coach, err := h.userService.GetCoachByID(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, "coach not found")
	}

	// Count current active athletes.
	athletes, err := h.userService.GetAthletesByCoach(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to count athletes")
	}
	if len(athletes) >= coach.MaxAthletes {
		return appresponse.Error(c, fiber.StatusBadRequest, "max athletes reached")
	}

	// Create the Clerk invitation.
	clerkInvID, err := h.createClerkInvitation(email, userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to create invitation")
	}

	// Persist the pending invite.
	expiresAt := time.Now().Add(7 * 24 * time.Hour).Format(time.RFC3339)
	if err := h.service.CreatePendingInvite(c.Context(), &invitedomain.PendingInvite{
		ID:                 clerkInvID,
		CoachID:            userID,
		Email:              email,
		ClerkInvitationID:  clerkInvID,
		Status:             "pending",
		ExpiresAt:          expiresAt,
		CreatedAt:          time.Now().Format(time.RFC3339),
	}); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to save invite")
	}

	return appresponse.Success(c, fiber.Map{
		"success":      true,
		"invitationId": clerkInvID,
		"email":        email,
	})
}

// createClerkInvitation calls the Clerk Backend API to create an invitation.
func (h *InviteHandler) createClerkInvitation(email, coachID string) (string, error) {
	body, err := json.Marshal(map[string]interface{}{
		"email_address": email,
		"redirect_url":  "mrtraining://invite",
		"metadata":      map[string]string{"coachId": coachID},
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost,
		"https://api.clerk.com/v1/invitations", strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+h.clerkSecretKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("clerk invitation failed: status %d body %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", err
	}
	return parsed.ID, nil
}
