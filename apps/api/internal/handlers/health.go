// Package handlers provides HTTP endpoint handlers for the MR Training API.
package handlers

import (
	"database/sql"

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

// ReadinessResponse represents the payload returned by the readiness check endpoint.
type ReadinessResponse struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services,omitempty"`
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
// If a database connection is provided, it verifies connectivity.
// Otherwise, it reports the service as ready without database checks.
func ReadinessCheck(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		services := make(map[string]string)

		// Check database connectivity
		if db != nil {
			if err := db.Ping(); err != nil {
				services["database"] = "unhealthy: " + err.Error()
				return response.JSON(c, fiber.StatusServiceUnavailable, ReadinessResponse{
					Status:   "not_ready",
					Services: services,
				})
			}
			services["database"] = "healthy"
		}

		return response.Success(c, ReadinessResponse{
			Status:   "ready",
			Services: services,
		})
	}
}
