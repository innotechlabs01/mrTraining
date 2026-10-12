package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/application/payment"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// PaymentHandler handles MercadoPago checkout endpoints.
type PaymentHandler struct {
	svc *payment.Service
}

func NewPaymentHandler(svc *payment.Service) *PaymentHandler {
	return &PaymentHandler{svc: svc}
}

// RegisterPublicPaymentRoutes mounts the webhook OUTSIDE the auth group —
// MercadoPago cannot attach a Clerk token to its notifications.
func RegisterPublicPaymentRoutes(app fiber.Router, handler *PaymentHandler) {
	app.Post("/payments/webhook", handler.handleWebhook)
}

// RegisterPaymentRoutes mounts athlete-facing checkout endpoints. The caller
// must pass the auth-protected /api/v1 group.
func RegisterPaymentRoutes(api fiber.Router, handler *PaymentHandler) {
	api.Post("/payments/cart/preference", middleware.RequireAthlete(), handler.handleCartPreference)
	api.Post("/payments/membership/preference", middleware.RequireAthlete(), handler.handleMembershipPreference)
	api.Get("/payments/orders/:id", middleware.RequireAthlete(), handler.handleGetOrder)
}

// handleCartPreference validates the cart against the DB, creates a pending
// order and returns the MercadoPago init point for the browser flow.
func (h *PaymentHandler) handleCartPreference(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req struct {
		Items []payment.CartPreferenceItem `json:"items"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	resp, err := h.svc.CreateCartPreference(c.Context(), athleteID, req.Items)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			return appresponse.Error(c, appErr.Status, appErr.Message)
		}
		log.Printf("[payment] cart preference error: %v", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "internal error")
	}

	return appresponse.Success(c, resp)
}

// handleGetOrder lets the client poll the order status after the browser
// payment flow returns.
func (h *PaymentHandler) handleGetOrder(c *fiber.Ctx) error {
	orderID := c.Params("id")
	if orderID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "order id required")
	}

	order, err := h.svc.GetOrder(c.Context(), orderID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, "order not found")
	}
	return appresponse.Success(c, order)
}

// handleMembershipPreference creates an MP preference for the athlete's
// current membership plan (price set by the coach on the web).
func (h *PaymentHandler) handleMembershipPreference(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	resp, err := h.svc.CreateMembershipPreference(c.Context(), athleteID)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			return appresponse.Error(c, appErr.Status, appErr.Message)
		}
		log.Printf("[payment] membership preference error: %v", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "internal error")
	}

	return appresponse.Success(c, resp)
}

// handleWebhook processes MercadoPago payment notifications. Signed with the
// webhook secret (x-signature); fulfillment is idempotent per order.
func (h *PaymentHandler) handleWebhook(c *fiber.Ctx) error {
	body := c.Body()
	signature := c.Get("x-signature")

	if err := h.svc.ProcessWebhook(c.Context(), body, signature); err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			// Always answer 200 for invalid signatures so MercadoPago does not
			// retry abusive payloads; real errors are logged server-side.
			log.Printf("[payment] webhook rejected: %s", appErr.Message)
			return appresponse.Error(c, appErr.Status, appErr.Message)
		}
		log.Printf("[payment] webhook error: %v", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "internal error")
	}

	return appresponse.Success(c, fiber.Map{"received": true})
}
