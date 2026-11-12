package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/application/wompiavailability"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// WompiAvailabilityHandler serves the Wompi availability gate snapshot.
type WompiAvailabilityHandler struct {
	gate *wompiavailability.Service
}

// NewWompiAvailabilityHandler wires the handler with the availability service.
func NewWompiAvailabilityHandler(gate *wompiavailability.Service) *WompiAvailabilityHandler {
	return &WompiAvailabilityHandler{gate: gate}
}

// Handle returns the safe availability snapshot.
func (h *WompiAvailabilityHandler) Handle(c *fiber.Ctx) error {
	return appresponse.Success(c, h.gate.Availability(c.Context()))
}