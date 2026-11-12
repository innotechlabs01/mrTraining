// Package handlers provides HTTP endpoint handlers for the subscription
// (plans & payments) domain. Handlers are thin translation layers: they parse
// requests, invoke use cases, and serialize responses. No business logic lives
// here.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	subscriptionapp "github.com/innotechlabs01/mr-training-api/internal/application/subscription"
	subscriptiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// SubscriptionHandler handles subscription HTTP requests.
type SubscriptionHandler struct {
	svc *subscriptionapp.Service
}

// NewSubscriptionHandler creates a new subscription handler.
func NewSubscriptionHandler(svc *subscriptionapp.Service) *SubscriptionHandler {
	return &SubscriptionHandler{svc: svc}
}

// RegisterSubscriptionRoutes mounts athlete- and coach-facing subscription
// endpoints on the auth-protected /api/v1 group.
func (h *SubscriptionHandler) RegisterSubscriptionRoutes(api fiber.Router) {
	subs := api.Group("/subscriptions")
	subs.Post("", middleware.RequireAthlete(), h.HandleSubscribe)
	subs.Get("/me", middleware.RequireAthlete(), h.HandleGetMySubscription)
	subs.Get("", middleware.RequireCoach(), h.HandleListSubscriptions)
	subs.Put("/:id/cancel", middleware.RequireCoach(), h.HandleCancel)
}

// RegisterMercadoPagoWebhook mounts the public MercadoPago webhook OUTSIDE the
// auth group — MercadoPago cannot attach a Clerk token to its notifications.
func (h *SubscriptionHandler) RegisterMercadoPagoWebhook(app fiber.Router) {
	app.Post("/webhooks/mercadopago", middleware.RateLimit(120, 60), h.HandleWebhook)
}

// RegisterWompiWebhook mounts the public Wompi webhook OUTSIDE the auth group.
// Wompi is the active payment provider; MP remains legacy-only.
func (h *SubscriptionHandler) RegisterWompiWebhook(app fiber.Router) {
	app.Post("/webhooks/wompi", middleware.RateLimit(120, 60), h.HandleWebhook)
}

// RegisterCoachPlatformSubscriptionRoutes registers coach platform subscription endpoints.
func (h *SubscriptionHandler) RegisterCoachPlatformSubscriptionRoutes(api fiber.Router) {
	coachSubs := api.Group("/coach/subscription")
	coachSubs.Post("/checkout", h.HandleCoachPlatformCheckout)
	coachSubs.Get("/status", h.HandleCoachPlatformSubscriptionStatus)
}

// HandleSubscribe creates a subscription for the authenticated athlete on the
// given plan and returns the checkout URL for the MercadoPago browser flow.
func (h *SubscriptionHandler) HandleSubscribe(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.SubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	coachID := middleware.GetCoachID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "no active coach context")
	}

	result, err := h.svc.Subscribe(c.Context(), subscriptionapp.SubscribeCommand{
		AthleteID:       athleteID,
		CoachID:         coachID,
		PlanID:          req.PlanID,
		GracePeriodDays: req.GracePeriodDays,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.SubscribeResponse{
		Subscription: *dto.ToSubscriptionResponse(result.Subscription),
		CheckoutURL:  result.CheckoutURL,
		Reference:    result.Reference,
	})
}

// HandleGetMySubscription returns the authenticated athlete's current subscription.
func (h *SubscriptionHandler) HandleGetMySubscription(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sub, err := h.svc.GetByAthlete(c.Context(), athleteID)
	if err != nil {
		return h.handleError(c, err)
	}
	if sub == nil {
		return appresponse.Error(c, fiber.StatusNotFound, "no active subscription found")
	}

	return appresponse.Success(c, dto.ToSubscriptionResponse(sub))
}

// HandleListSubscriptions returns all subscriptions for the authenticated coach's athletes.
func (h *SubscriptionHandler) HandleListSubscriptions(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	subs, err := h.svc.ListByCoach(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.SubscriptionResponse, len(subs))
	for i, s := range subs {
		responses[i] = *dto.ToSubscriptionResponse(s)
	}

	return appresponse.Success(c, dto.ListSubscriptionsResponse{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// HandleCancel cancels a subscription. Only the owning coach may cancel.
func (h *SubscriptionHandler) HandleCancel(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "subscription id is required")
	}

	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	if err := h.svc.Cancel(c.Context(), subscriptionapp.CancelCommand{
		SubscriptionID: id,
		CoachID:        coachID,
	}); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.CancelResponse{
		SubscriptionID: id,
		Status:         string(subscriptiondomain.StatusCancelled),
		Message:        "subscription cancelled",
	})
}

// HandleWebhook processes MercadoPago payment notifications. It verifies the
// webhook signature, fetches the payment from MercadoPago, and fulfills the
// referenced subscription when approved. Always answers 200 so MercadoPago
// does not retry acknowledged payloads.
func (h *SubscriptionHandler) HandleWebhook(c *fiber.Ctx) error {
	body := c.Body()
	signature := c.Get("x-signature")

	if err := h.svc.FulfillWebhook(c.Context(), subscriptiondomain.WebhookRequest{
		Body:            body,
		SignatureHeader: signature,
	}); err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			// Acknowledge invalid signatures so MercadoPago does not retry.
			return appresponse.Error(c, appErr.Status, appErr.Message)
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, "internal error")
	}

	return appresponse.Success(c, fiber.Map{"received": true})
}

// HandleCoachPlatformCheckout creates a platform subscription checkout for the authenticated coach.
// This allows coaches to subscribe to a platform plan (Starter/Pro/Elite).
func (h *SubscriptionHandler) HandleCoachPlatformCheckout(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req struct {
		PlanID string `json:"plan_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.PlanID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "plan_id is required")
	}

	// For coach platform subscription, the coach is both the athlete and coach
	result, err := h.svc.Subscribe(c.Context(), subscriptionapp.SubscribeCommand{
		AthleteID:       coachID,
		CoachID:         coachID,
		PlanID:          req.PlanID,
		GracePeriodDays: 5,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.SubscribeResponse{
		Subscription: *dto.ToSubscriptionResponse(result.Subscription),
		CheckoutURL:  result.CheckoutURL,
		Reference:    result.Reference,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *SubscriptionHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// HandleCoachPlatformSubscriptionStatus returns the payment status of the
// authenticated coach's platform subscription.
//
// The payment provider confirms the payment asynchronously through the
// webhook, so the frontend polls this endpoint instead of trusting the
// redirect the payer came back with. The subscription row is created before
// the payment, so the status is derived from the PAYMENT record.
func (h *SubscriptionHandler) HandleCoachPlatformSubscriptionStatus(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	status, sub, err := h.svc.GetPaymentStatus(c.Context(), coachID)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok && appErr.Status == fiber.StatusNotFound {
			return appresponse.Success(c, dto.CoachSubscriptionStatusResponse{Status: subscriptionapp.PaymentStatusNone})
		}
		return h.handleError(c, err)
	}

	resp := dto.CoachSubscriptionStatusResponse{Status: status}
	if sub != nil {
		resp.Reference = sub.ID
		resp.PlanID = sub.PlanID
		resp.PlanName = sub.PlanName
	}
	return appresponse.Success(c, resp)
}
