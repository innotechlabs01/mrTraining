package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/application/payment"
)

// PaymentHandler handles HTTP requests for the payment domain.
type PaymentHandler struct {
	svc *payment.Service
}

// NewPaymentHandler creates a new PaymentHandler with the given application service.
func NewPaymentHandler(svc *payment.Service) *PaymentHandler {
	return &PaymentHandler{svc: svc}
}

// RegisterRoutes registers the payment endpoints in the Fiber app.
// The handler must be created with NewPaymentHandler first.
func RegisterRoutes(api fiber.Router, handler *PaymentHandler) {
	pr := api.Group("/v1/payments")
	{
		pr.Post("/preference", handlerCreatePreference(handler))
		pr.Post("/webhook", handlerWebhook(handler))
		pr.Get("/status/:id", handlerPaymentStatus(handler))
	}
}

// handlerCreatePreference creates a handler function for creating payment preference.
func handlerCreatePreference(h *PaymentHandler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req payment.PreferenceRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
		}

		resp, err := h.svc.CreatePreference(c.Context(), &req)
		if err != nil {
			log.Printf("Error creating preference: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(resp)
	}
}

// handlerWebhook creates a handler function for processing webhook.
func handlerWebhook(h *PaymentHandler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		body := c.Body()
		signature := c.Get("X-Signature-Ed25519")

		resp, err := h.svc.ProcessWebhook(body, signature)
		if err != nil {
			log.Printf("Error processing webhook: %v", err)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(resp)
	}
}

// handlerPaymentStatus creates a handler function for getting payment status.
func handlerPaymentStatus(h *PaymentHandler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		status, err := h.svc.GetPaymentStatus(id)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "payment not found"})
		}

		return c.JSON(fiber.Map{"status": status})
	}
}