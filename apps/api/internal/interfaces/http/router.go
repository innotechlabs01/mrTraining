package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

func NewAPIV1Router() *fiber.App {
	app := fiber.New()

	app.Use(func(c *fiber.Ctx) error {
		if len(c.Path()) >= 7 && c.Path()[:7] == "/api/v1" {
			c.Set("API-Version", "v1")
		}
		return c.Next()
	})

	api := app.Group("/api/v1")
	api.Use(middleware.RateLimit(100, 60))
	// Auth middleware applied per route group in main

	return app
}
