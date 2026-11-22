package handlers

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	mediaapp "github.com/innotechlabs01/mr-training-api/internal/application/media"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/media"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/storage"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// MediaHandler exposes Cloudflare R2 presigned upload, confirmation, and signed read endpoints.
type MediaHandler struct {
	service *mediaapp.Service
}

// NewMediaHandler constructs a MediaHandler.
func NewMediaHandler(service *mediaapp.Service) *MediaHandler {
	return &MediaHandler{service: service}
}

// PresignUpload handles POST /api/v1/media/presign-upload.
func (h *MediaHandler) PresignUpload(c *fiber.Ctx) error {
	var req dto.PresignUploadRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	res, err := h.service.PresignUpload(c.Context(), actorFromCtx(c), mediaapp.PresignUploadInput{
		Purpose:     req.Purpose,
		Filename:    req.Filename,
		ContentType: req.ContentType,
		SizeBytes:   req.SizeBytes,
		ResourceID:  req.ResourceID,
	})
	if err != nil {
		return mapMediaError(c, err)
	}
	return appresponse.Success(c, res)
}

// ConfirmUpload handles POST /api/v1/media/confirm.
func (h *MediaHandler) ConfirmUpload(c *fiber.Ctx) error {
	var req dto.ConfirmUploadRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	res, err := h.service.ConfirmUpload(c.Context(), actorFromCtx(c), mediaapp.ConfirmUploadInput{
		MediaID:   req.MediaID,
		ObjectKey: req.ObjectKey,
	})
	if err != nil {
		return mapMediaError(c, err)
	}
	return appresponse.Success(c, res)
}

// PresignRead handles POST /api/v1/media/presign-read.
func (h *MediaHandler) PresignRead(c *fiber.Ctx) error {
	var req dto.PresignReadRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	urls, err := h.service.PresignReadBatch(c.Context(), actorFromCtx(c), req.Refs)
	if err != nil {
		return mapMediaError(c, err)
	}
	return appresponse.Success(c, fiber.Map{"urls": urls})
}

// GetSignedURL handles GET /api/v1/media/signed-url?ref=r2://...
func (h *MediaHandler) GetSignedURL(c *fiber.Ctx) error {
	ref := strings.TrimSpace(c.Query("ref"))
	if ref == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "ref query parameter is required")
	}

	urls, err := h.service.PresignReadBatch(c.Context(), actorFromCtx(c), []string{ref})
	if err != nil {
		return mapMediaError(c, err)
	}
	entry, ok := urls[ref]
	if !ok {
		return appresponse.Error(c, fiber.StatusNotFound, "media object not found or forbidden")
	}
	return appresponse.Success(c, entry)
}

// DeleteMedia handles DELETE /api/v1/media/:id.
func (h *MediaHandler) DeleteMedia(c *fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "media id is required")
	}
	if err := h.service.Delete(c.Context(), actorFromCtx(c), id); err != nil {
		return mapMediaError(c, err)
	}
	return appresponse.Success(c, fiber.Map{"deleted": true})
}

// PublicViewRedirect handles GET /public/media/view?key=...
// Only objects with visibility='public' AND status='ready' redirect to a short-lived R2 signed URL.
func (h *MediaHandler) PublicViewRedirect(c *fiber.Ctx) error {
	key := strings.TrimSpace(c.Query("key"))
	if key == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "key query parameter is required")
	}
	signedURL, err := h.service.ResolvePublicView(c.Context(), key)
	if err != nil {
		return mapMediaError(c, err)
	}
	c.Set("Cache-Control", "private, max-age=300")
	return c.Redirect(signedURL, fiber.StatusTemporaryRedirect)
}

func actorFromCtx(c *fiber.Ctx) mediaapp.Actor {
	return mediaapp.Actor{
		UserID:  middleware.GetUserID(c),
		CoachID: middleware.GetCoachID(c),
		Role:    middleware.GetUserRole(c),
	}
}

// normalizeMediaRef validates and canonicalizes an incoming media URL/r2:// ref.
// If mediaSvc is nil or R2 is disabled, it only rejects unsafe schemes.
func normalizeMediaRef(c *fiber.Ctx, mediaSvc *mediaapp.Service, raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil
	}
	if mediaSvc != nil && mediaSvc.Enabled() {
		return mediaSvc.NormalizeAndValidateRef(c.Context(), actorFromCtx(c), trimmed)
	}
	if strings.HasPrefix(trimmed, "r2://") || strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") || strings.HasPrefix(trimmed, "/uploads/") {
		return trimmed, nil
	}
	return "", domain.ErrInvalidMediaType
}

func mapMediaError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, storage.ErrStorageNotConfigured):
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "media storage is not configured")
	case errors.Is(err, domain.ErrForbidden):
		return appresponse.Error(c, fiber.StatusForbidden, "forbidden")
	case errors.Is(err, domain.ErrNotFound), errors.Is(err, domain.ErrObjectMissing):
		return appresponse.Error(c, fiber.StatusNotFound, err.Error())
	case errors.Is(err, domain.ErrInvalidPurpose),
		errors.Is(err, domain.ErrInvalidMediaType),
		errors.Is(err, domain.ErrFileTooLarge),
		errors.Is(err, domain.ErrMagicMismatch):
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	default:
		return appresponse.Error(c, fiber.StatusInternalServerError, "media operation failed")
	}
}
