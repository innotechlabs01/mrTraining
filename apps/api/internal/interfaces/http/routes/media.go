package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
)

// RegisterMediaRoutes mounts authenticated Cloudflare R2 media endpoints under /api/v1/media.
func RegisterMediaRoutes(api fiber.Router, h *handlers.MediaHandler) {
	g := api.Group("/media")
	g.Post("/presign-upload", h.PresignUpload)
	g.Post("/confirm", h.ConfirmUpload)
	g.Post("/presign-read", h.PresignRead)
	g.Get("/signed-url", h.GetSignedURL)
	g.Delete("/:id", h.DeleteMedia)
}

// RegisterPublicMediaRoutes mounts public signed-redirect media endpoint under /public/media.
func RegisterPublicMediaRoutes(pub fiber.Router, h *handlers.MediaHandler) {
	pub.Get("/media/view", h.PublicViewRedirect)
}
