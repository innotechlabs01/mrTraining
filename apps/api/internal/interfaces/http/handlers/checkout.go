package handlers

import (
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"

	checkoutapp "github.com/innotechlabs01/mr-training-api/internal/application/checkout"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// checkoutService is the subset of the checkout application service used by
// the handler.
type checkoutService interface {
	Start(ctx context.Context, cmd checkoutapp.StartCommand) (*checkoutapp.StartResult, error)
	Claim(ctx context.Context, cmd checkoutapp.ClaimCommand) (*checkoutapp.ClaimResult, error)
}

// CheckoutHandler handles the hybrid checkout endpoints: paying before the
// buyer has an account, and claiming the payment once they register.
type CheckoutHandler struct {
	svc checkoutService
}

// NewCheckoutHandler creates a new checkout handler.
func NewCheckoutHandler(svc checkoutService) *CheckoutHandler {
	return &CheckoutHandler{svc: svc}
}

// RegisterCheckoutRoutes mounts the checkout endpoints.
//
// The start endpoint is PUBLIC (the buyer has no account yet) and lives in
// the /public group; the claim endpoint is authenticated and lives in the
// protected /api/v1 group.
func (h *CheckoutHandler) RegisterCheckoutRoutes(api fiber.Router, pub fiber.Router) {
	pub.Post("/checkouts", middleware.RateLimit(20, 60), h.HandleStart)
	api.Post("/checkouts/:id/claim", h.HandleClaim)
}

// HandleStart handles POST /public/checkouts.
//
// It issues the payment link for the chosen plan. The buyer does not need an
// account yet: the payment is recorded on a pending checkout and claimed
// after they register.
func (h *CheckoutHandler) HandleStart(c *fiber.Ctx) error {
	var req dto.StartCheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	result, err := h.svc.Start(c.Context(), checkoutapp.StartCommand{
		PlanID: req.PlanID,
		Email:  req.Email,
	})
	if err != nil {
		return handleCheckoutError(c, err)
	}

	if result.Recovered {
		// The buyer already paid for this plan: send them back to the claim
		// instead of charging them again.
		return appresponse.Success(c, dto.StartCheckoutResponse{
			CheckoutID: result.CheckoutID,
			Recovered:  true,
		})
	}

	return appresponse.Success(c, dto.StartCheckoutResponse{
		CheckoutID:  result.CheckoutID,
		CheckoutURL: result.CheckoutURL,
	})
}

// HandleClaim handles POST /api/v1/checkouts/:id/claim.
//
// It attaches a paid checkout to the authenticated caller: it creates the
// subscription, provisions the coach account and mirrors role + coach code +
// plan into the public metadata.
func (h *CheckoutHandler) HandleClaim(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	checkoutID := c.Params("id")
	if checkoutID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "checkout id is required")
	}

	result, err := h.svc.Claim(c.Context(), checkoutapp.ClaimCommand{
		CheckoutID: checkoutID,
		UserID:     userID,
	})
	if err != nil {
		return handleCheckoutError(c, err)
	}

	return appresponse.Success(c, dto.ClaimCheckoutResponse{
		CheckoutID: result.CheckoutID,
		CoachID:    result.CoachID,
		CoachCode:  result.CoachCode,
		PlanID:     result.PlanID,
		PlanName:   result.PlanName,
	})
}

// handleCheckoutError maps application errors to HTTP responses.
func handleCheckoutError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	// Unexpected failures are logged: the response stays generic but the cause
	// is recoverable from the logs.
	fmt.Printf("checkout error: %v\n", err)
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
