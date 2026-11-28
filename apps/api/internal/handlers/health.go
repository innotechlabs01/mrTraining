// Package handlers provides HTTP endpoint handlers for the MR Training API.
package handlers

import (
	"context"
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
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
	Status   string                       `json:"status"`
	Services map[string]string            `json:"services,omitempty"`
	Breakers []resilience.BreakerSnapshot `json:"breakers,omitempty"`
}

// ReadinessDeps configures optional infrastructure checks exposed by ReadinessCheckWithDeps.
type ReadinessDeps struct {
	DB        *sql.DB
	RedisPing func(context.Context) error
	NATSAlive func() bool
}

// HealthCheck handles GET /health and always returns 200 OK.
// It reports application name, environment, and the build-injected version.
func HealthCheck(appName, env, version string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return response.Success(c, HealthResponse{
			Status:  "ok",
			App:     appName,
			Env:     env,
			Version: version,
		})
	}
}

// ReadinessCheck handles GET /ready and checks database connectivity alongside
// registered circuit breaker states.
func ReadinessCheck(db *sql.DB) fiber.Handler {
	return ReadinessCheckWithDeps(ReadinessDeps{DB: db})
}

// ReadinessCheckWithDeps handles GET /ready with rich dependency diagnostics
// covering PostgreSQL, optional Redis, optional NATS, and registered circuit breakers.
func ReadinessCheckWithDeps(deps ReadinessDeps) fiber.Handler {
	return func(c *fiber.Ctx) error {
		services := make(map[string]string)
		breakers := resilience.DefaultRegistry.Snapshot()

		if deps.DB != nil {
			pingCtx, cancel := context.WithTimeout(c.UserContext(), 1*time.Second)
			err := deps.DB.PingContext(pingCtx)
			cancel()
			if err != nil {
				services["database"] = "unhealthy: " + err.Error()
				return response.JSON(c, fiber.StatusServiceUnavailable, ReadinessResponse{
					Status:   "not_ready",
					Services: services,
					Breakers: breakers,
				})
			}
			services["database"] = "healthy"
		}

		degraded := false
		if deps.RedisPing != nil {
			pingCtx, cancel := context.WithTimeout(c.UserContext(), 500*time.Millisecond)
			err := deps.RedisPing(pingCtx)
			cancel()
			if err != nil {
				services["redis"] = "degraded: " + err.Error()
				degraded = true
			} else {
				services["redis"] = "healthy"
			}
		}

		if deps.NATSAlive != nil {
			if deps.NATSAlive() {
				services["nats"] = "healthy"
			} else {
				services["nats"] = "degraded: disconnected"
				degraded = true
			}
		}

		status := "ready"
		if degraded {
			status = "degraded"
		}

		return response.Success(c, ReadinessResponse{
			Status:   status,
			Services: services,
			Breakers: breakers,
		})
	}
}
