package health

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Checker interface {
	Name() string
	Check(ctx context.Context) error
}

type DBHealthChecker struct {
	db *pgxpool.Pool
}

func NewDBHealthChecker(db *pgxpool.Pool) *DBHealthChecker {
	return &DBHealthChecker{db: db}
}

func (c *DBHealthChecker) Name() string { return "postgres" }

func (c *DBHealthChecker) Check(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return c.db.Ping(ctx)
}

type RedisHealthChecker struct {
	client *redis.Client
}

func NewRedisHealthChecker(client *redis.Client) *RedisHealthChecker {
	return &RedisHealthChecker{client: client}
}

func (c *RedisHealthChecker) Name() string { return "redis" }

func (c *RedisHealthChecker) Check(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return c.client.Ping(ctx).Err()
}

type HealthStatus string

const (
	StatusHealthy   HealthStatus = "healthy"
	StatusUnhealthy HealthStatus = "unhealthy"
	StatusDegraded  HealthStatus = "degraded"
)

type ComponentHealth struct {
	Name   string        `json:"name"`
	Status HealthStatus  `json:"status"`
	Error  string        `json:"error,omitempty"`
	Latency time.Duration `json:"latency_ms,omitempty"`
}

type HealthResponse struct {
	Status     HealthStatus      `json:"status"`
	Timestamp  time.Time         `json:"timestamp"`
	Components []ComponentHealth `json:"components"`
}

type HealthHandler struct {
	checkers []Checker
}

func NewHealthHandler(checkers ...Checker) *HealthHandler {
	return &HealthHandler{checkers: checkers}
}

func (h *HealthHandler) Liveness(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "alive",
	})
}

func (h *HealthHandler) Readiness(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	response := HealthResponse{
		Status:     StatusHealthy,
		Timestamp:  time.Now(),
		Components: make([]ComponentHealth, 0, len(h.checkers)),
	}

	for _, checker := range h.checkers {
		start := time.Now()
		err := checker.Check(ctx)
		latency := time.Since(start)

		comp := ComponentHealth{
			Name:    checker.Name(),
			Latency: latency,
		}

		if err != nil {
			comp.Status = StatusUnhealthy
			comp.Error = err.Error()
			response.Status = StatusUnhealthy
		} else {
			comp.Status = StatusHealthy
		}

		response.Components = append(response.Components, comp)
	}

	w.Header().Set("Content-Type", "application/json")
	if response.Status == StatusHealthy {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	json.NewEncoder(w).Encode(response)
}

func (h *HealthHandler) FiberLiveness(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "alive"})
}

func (h *HealthHandler) FiberReadiness(c *fiber.Ctx) error {
	ctx := c.Context()
	response := HealthResponse{
		Status:     StatusHealthy,
		Timestamp:  time.Now(),
		Components: make([]ComponentHealth, 0, len(h.checkers)),
	}

	for _, checker := range h.checkers {
		start := time.Now()
		err := checker.Check(ctx)
		latency := time.Since(start)

		comp := ComponentHealth{
			Name:    checker.Name(),
			Latency: latency,
		}

		if err != nil {
			comp.Status = StatusUnhealthy
			comp.Error = err.Error()
			response.Status = StatusUnhealthy
		} else {
			comp.Status = StatusHealthy
		}

		response.Components = append(response.Components, comp)
	}

	if response.Status == StatusHealthy {
		return c.JSON(response)
	}
	return c.Status(fiber.StatusServiceUnavailable).JSON(response)
}

var _ Checker = (*DBHealthChecker)(nil)
var _ Checker = (*RedisHealthChecker)(nil)
