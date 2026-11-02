package middleware

import (
	"context"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/errors"
	membership "github.com/innotechlabs01/mr-training-api/internal/application/membership"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// RequireActiveMembership returns Fiber middleware that checks if the
// authenticated athlete has an active or valid membership (status in
// {active, trial, past_due}). If not, it returns 403 with error code
// MEMBERSHIP_REQUIRED and message "membresía inactiva — renueva para continuar".
//
// The middleware accepts a MembershipStatusReader interface so it can be
// tested with a fake and stay decoupled from the full service.
func membershipError(c *fiber.Ctx, status int, code, message string) error {
	reqID, _ := c.Locals("request_id").(string)
	return c.Status(status).JSON(appresponse.ErrorResponse{
		Error: appresponse.ErrorDetail{Code: code, Message: message},
		RequestID: reqID,
	})
}

// RequireActiveMembership returns Fiber middleware that checks if the
// authenticated athlete has an active or valid membership (status in
// {active, trial, past_due}). If not, it returns 403 with error code
// MEMBERSHIP_REQUIRED and message "membresía inactiva — renueva para continuar".
//
// The middleware accepts a MembershipStatusReader interface so it can be
// tested with a fake and stay decoupled from the full service.
func RequireActiveMembership(reader MembershipStatusReader) fiber.Handler {
	return func(c *fiber.Ctx) error {
		athleteID := c.Locals("athlete_id").(string)
		if athleteID == "" {
			userID := GetUserID(c)
			if userID == "" {
				return membershipError(c, fiber.StatusUnauthorized, "UNAUTHENTICATED", "user not authenticated")
			}
			athleteID = userID
		}

		status, hasActiveMembership, err := reader.GetMembershipStatus(c.Context(), athleteID)
		if err != nil {
			// A "membership not found" error means the athlete has no
			// membership: fail closed to 403 MEMBERSHIP_REQUIRED (not a 500).
			// Any AppError from the reader means membership could not be
			// established for this athlete -> deny. Only a plain (non-AppError)
			// infrastructure failure -> 500, never silently allow.
			if _, ok := err.(*errors.AppError); ok {
				return membershipError(c, fiber.StatusForbidden, "MEMBERSHIP_REQUIRED", "membresía inactiva — renueva para continuar")
			}
			// Genuine infrastructure error -> 500, never silently allow
			return membershipError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		}

		// Whitelist: only these statuses are allowed active
		allowedStatuses := map[string]bool{
			"active":   true,
			"trial":    true,
			"past_due": true,
		}
		hasActiveMembership = allowedStatuses[status]

		if hasActiveMembership {
			return nil
		}

		// Fail-closed: no membership or unknown status -> 403 MEMBERSHIP_REQUIRED
		return membershipError(c, fiber.StatusForbidden, "MEMBERSHIP_REQUIRED", "membresía inactiva — renueva para continuar")
	}
}

// MembershipStatusReader defines the minimal interface needed by the
// RequireActiveMiddleware to check membership status.
type MembershipStatusReader interface {
	GetMembershipStatus(ctx context.Context, athleteID string) (status string, hasActiveMembership bool, err error)
}

// membershipStatusReader is a concrete implementation of MembershipStatusReader
// that uses the membership application service.
type membershipStatusReader struct {
	service *membership.Service
}

// NewMembershipStatusReader creates a MembershipStatusReader that uses the
// given membership service.
func NewMembershipStatusReader(service *membership.Service) MembershipStatusReader {
	return &membershipStatusReader{service: service}
}

// GetMembershipStatus implements MembershipStatusReader by calling the
// membership service's GetMembership method and normalizing the status.
func (r *membershipStatusReader) GetMembershipStatus(ctx context.Context, athleteID string) (string, bool, error) {
	m, err := r.service.GetMembership(ctx, athleteID)
	if err != nil {
		return "", false, err
	}

	// Recalculate status (the service already does this, but be explicit)
	m.RecalculateStatus()

	// Determine if the membership is "active" (status ∈ {active, trial, past_due})
	hasActiveMembership := m.Status != "expired" && m.Status != "cancelled"

	return m.Status, hasActiveMembership, nil
}