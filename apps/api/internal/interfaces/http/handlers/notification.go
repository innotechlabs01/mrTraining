// Package handlers provides HTTP endpoint handlers for the notification domain.
package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	notifapp "github.com/innotechlabs01/mr-training-api/internal/application/notification"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// NotificationHandler handles HTTP requests for the notification domain.
type NotificationHandler struct {
	service *notifapp.Service
}

// NewNotificationHandler creates a new NotificationHandler with the given application service.
func NewNotificationHandler(service *notifapp.Service) *NotificationHandler {
	return &NotificationHandler{service: service}
}

// RegisterDevice handles POST /devices.
// Registers a device token for push notifications.
func (h *NotificationHandler) RegisterDevice(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.RegisterDeviceRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Token == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "token is required")
	}
	if req.Platform == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "platform is required")
	}

	validPlatforms := map[string]bool{"ios": true, "android": true, "web": true}
	if !validPlatforms[req.Platform] {
		return appresponse.Error(c, fiber.StatusBadRequest, "platform must be one of: ios, android, web")
	}

	device, err := h.service.RegisterDevice(c.Context(), userID, req.Token, req.Platform)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.DeviceResponse{
		ID:        device.ID,
		UserID:    device.UserID,
		Platform:  device.Platform,
		IsActive:  device.IsActive,
		CreatedAt: device.CreatedAt,
	})
}

// RemoveDevice handles DELETE /devices/:id.
// Deactivates a device so it no longer receives push notifications.
func (h *NotificationHandler) RemoveDevice(c *fiber.Ctx) error {
	deviceID := c.Params("id")
	if deviceID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "device ID is required")
	}

	if err := h.service.RemoveDevice(c.Context(), deviceID); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "device removed"})
}

// ListDevices handles GET /devices.
// Returns all active devices for the authenticated user.
func (h *NotificationHandler) ListDevices(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	devices, err := h.service.ListDevices(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.DeviceResponse, len(devices))
	for i, d := range devices {
		responses[i] = dto.DeviceResponse{
			ID:        d.ID,
			UserID:    d.UserID,
			Platform:  d.Platform,
			IsActive:  d.IsActive,
			CreatedAt: d.CreatedAt,
		}
	}

	return appresponse.Success(c, responses)
}

// ListNotifications handles GET /notifications.
// Returns paginated notifications for the authenticated user.
func (h *NotificationHandler) ListNotifications(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	params := dto.PaginationParams{Page: page, Limit: limit}
	params.Normalize()

	notifications, total, err := h.service.GetNotifications(c.Context(), userID, params.Page, params.Limit)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.NotificationResponse, len(notifications))
	for i, n := range notifications {
		responses[i] = toNotificationResponse(n)
	}

	return appresponse.Success(c, dto.ListResponse[dto.NotificationResponse]{
		Data:  responses,
		Total: total,
		Page:  params.Page,
		Limit: params.Limit,
	})
}

// MarkRead handles PATCH /notifications/:id/read.
// Marks a single notification as read.
func (h *NotificationHandler) MarkRead(c *fiber.Ctx) error {
	notificationID := c.Params("id")
	if notificationID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "notification ID is required")
	}

	if err := h.service.MarkRead(c.Context(), notificationID); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "notification marked as read"})
}

// MarkAllRead handles PATCH /notifications/read-all.
// Marks all notifications for the authenticated user as read.
func (h *NotificationHandler) MarkAllRead(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	count, err := h.service.MarkAllRead(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{
		"message": "all notifications marked as read",
		"count":   count,
	})
}

// toNotificationResponse converts a domain Notification entity to a DTO response.
func toNotificationResponse(n *domain.Notification) dto.NotificationResponse {
	return dto.NotificationResponse{
		ID:        n.ID,
		Type:      n.Type,
		Title:     n.Title,
		Message:   n.Message,
		Icon:      n.Icon,
		Read:      n.Read,
		CreatedAt: n.CreatedAt,
	}
}

// handleError maps application errors to appropriate HTTP responses.
func (h *NotificationHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperrors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
