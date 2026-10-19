// Package handlers — activity file import endpoint.
package handlers

import (
	"encoding/base64"
	"strings"

	"github.com/gofiber/fiber/v2"

	importactivity "github.com/innotechlabs01/mr-training-api/internal/application/importactivity"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// maxActivityFileBytes caps decoded uploads (10 MiB) — FIT/GPX/TCX files are
// far smaller in practice.
const maxActivityFileBytes = 10 << 20

// ImportActivityHandler imports GPX/TCX/FIT activity files.
type ImportActivityHandler struct {
	service *importactivity.Service
}

// NewImportActivityHandler creates the handler with its application service.
func NewImportActivityHandler(service *importactivity.Service) *ImportActivityHandler {
	return &ImportActivityHandler{service: service}
}

// ImportRunningActivity handles POST /running/import.
// Body: { "source": "gpx|tcx|fit", "data": "<base64>" }.
func (h *ImportActivityHandler) ImportRunningActivity(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req struct {
		Source string `json:"source"`
		Data   string `json:"data"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	source := strings.ToLower(strings.TrimSpace(req.Source))
	switch source {
	case "gpx", "tcx", "fit":
	default:
		return appresponse.Error(c, fiber.StatusBadRequest, "source must be gpx, tcx or fit")
	}
	if req.Data == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "data is required (base64)")
	}

	raw, err := base64.StdEncoding.DecodeString(req.Data)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "data must be valid base64")
	}
	if len(raw) == 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "empty file")
	}
	if len(raw) > maxActivityFileBytes {
		return appresponse.Error(c, fiber.StatusRequestEntityTooLarge, "file too large (max 10MB)")
	}

	session, points, err := h.service.Import(c.Context(), userID, source, raw)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return appresponse.Success(c, fiber.Map{
		"session":    toSessionResponse(session),
		"gps_points": points,
	})
}
