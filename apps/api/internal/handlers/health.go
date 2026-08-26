// Package handlers provides HTTP endpoint handlers for the MR Training API.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/pkg/response"
)

// HealthResponse represents the payload returned by the health check endpoint.
type HealthResponse struct {
	Status  string `json:"status"`
	App     string `json:"app"`
	Env     string `json:"env"`
	Version string `json:"version"`
}

// HealthCheck handles GET /health and always returns 200 OK.
// It reports application name, environment, and version for uptime monitoring.
func HealthCheck(appName, env string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return response.Success(c, HealthResponse{
			Status:  "ok",
			App:     appName,
			Env:     env,
			Version: "0.1.0",
		})
	}
}

// ReadinessCheck handles GET /ready and checks service dependencies.
// Currently returns ok without database connectivity checks (placeholder).
// TODO: Add database connectivity verification when Turso integration is ready.
func ReadinessCheck() fiber.Handler {
	return func(c *fiber.Ctx) error {
		return response.Success(c, fiber.Map{
			"status": "ready",
		})
	}
}
