package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	notifapp "github.com/innotechlabs01/mr-training-api/internal/application/notification"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type stubNotificationRepo struct {
	devices       map[string]*domain.Device
	notifications map[string]*domain.Notification
}

func newStubNotificationRepo() *stubNotificationRepo {
	return &stubNotificationRepo{
		devices:       make(map[string]*domain.Device),
		notifications: make(map[string]*domain.Notification),
	}
}

func (r *stubNotificationRepo) RegisterDevice(_ context.Context, d *domain.Device) error {
	r.devices[d.ID] = d
	return nil
}

func (r *stubNotificationRepo) RegisterOrReactivateDevice(_ context.Context, d *domain.Device) error {
	for _, existing := range r.devices {
		if existing.Token == d.Token {
			existing.UserID = d.UserID
			existing.Platform = d.Platform
			existing.IsActive = true
			*d = *existing
			return nil
		}
	}
	r.devices[d.ID] = d
	return nil
}

func (r *stubNotificationRepo) GetDevice(_ context.Context, id string) (*domain.Device, error) {
	if d, ok := r.devices[id]; ok {
		return d, nil
	}
	return nil, apperrors.NotFound("Device", id)
}

func (r *stubNotificationRepo) GetDeviceByToken(_ context.Context, token string) (*domain.Device, error) {
	for _, d := range r.devices {
		if d.Token == token {
			return d, nil
		}
	}
	return nil, apperrors.NotFound("Device", "token")
}

func (r *stubNotificationRepo) ListDevicesByUser(_ context.Context, userID string) ([]*domain.Device, error) {
	var out []*domain.Device
	for _, d := range r.devices {
		if d.UserID == userID && d.IsActive {
			out = append(out, d)
		}
	}
	return out, nil
}

func (r *stubNotificationRepo) DeactivateDevice(_ context.Context, id string) error {
	if d, ok := r.devices[id]; ok {
		d.IsActive = false
		return nil
	}
	return apperrors.NotFound("Device", id)
}

func (r *stubNotificationRepo) DeactivateDeviceForUser(_ context.Context, userID, id string) error {
	d, ok := r.devices[id]
	if !ok {
		return apperrors.NotFound("Device", id)
	}
	if d.UserID != userID {
		return apperrors.Forbidden("device does not belong to user")
	}
	d.IsActive = false
	return nil
}

func (r *stubNotificationRepo) SaveNotification(_ context.Context, n *domain.Notification) error {
	r.notifications[n.ID] = n
	return nil
}

func (r *stubNotificationRepo) GetNotification(_ context.Context, id string) (*domain.Notification, error) {
	if n, ok := r.notifications[id]; ok {
		return n, nil
	}
	return nil, apperrors.NotFound("Notification", id)
}

func (r *stubNotificationRepo) ListNotificationsByUser(_ context.Context, userID string, limit, offset int) ([]*domain.Notification, error) {
	return nil, nil
}

func (r *stubNotificationRepo) CountNotificationsByUser(_ context.Context, userID string) (int, error) {
	return 0, nil
}

func (r *stubNotificationRepo) MarkNotificationRead(_ context.Context, id string) error {
	if n, ok := r.notifications[id]; ok {
		n.Read = true
		return nil
	}
	return apperrors.NotFound("Notification", id)
}

func (r *stubNotificationRepo) MarkAsRead(_ context.Context, userID, id string) error {
	n, ok := r.notifications[id]
	if !ok {
		return apperrors.NotFound("Notification", id)
	}
	if n.UserID != userID {
		return apperrors.Forbidden("notification does not belong to user")
	}
	n.Read = true
	return nil
}

func (r *stubNotificationRepo) MarkAllNotificationsRead(_ context.Context, userID string) (int64, error) {
	return 0, nil
}

func (r *stubNotificationRepo) GetPreferences(_ context.Context, userID string) (*domain.NotificationPreference, error) {
	return &domain.NotificationPreference{UserID: userID}, nil
}

func (r *stubNotificationRepo) UpdatePreferences(_ context.Context, _ *domain.NotificationPreference) error {
	return nil
}

func setupNotificationTestApp(repo *stubNotificationRepo, callerUserID string) *fiber.App {
	svc := notifapp.NewService(repo, nil)
	h := NewNotificationHandler(svc)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if callerUserID != "" {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: callerUserID, Role: "athlete"})
		}
		return c.Next()
	})
	app.Delete("/api/v1/devices/:id", h.RemoveDevice)
	app.Patch("/api/v1/notifications/:id/read", h.MarkRead)
	return app
}

func TestNotificationHandler_RemoveDevice_IDOR(t *testing.T) {
	repo := newStubNotificationRepo()
	repo.devices["dev-1"] = &domain.Device{
		ID:       "dev-1",
		UserID:   "owner-user",
		Token:    "tok-1",
		Platform: "ios",
		IsActive: true,
	}

	// Attacker cannot deactivate owner's device
	attackerApp := setupNotificationTestApp(repo, "attacker-user")
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/devices/dev-1", nil)
	resp, err := attackerApp.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, resp.StatusCode)
	require.True(t, repo.devices["dev-1"].IsActive)

	// Missing device returns 404
	reqMissing := httptest.NewRequest(http.MethodDelete, "/api/v1/devices/dev-missing", nil)
	respMissing, err := attackerApp.Test(reqMissing)
	require.NoError(t, err)
	require.Equal(t, http.StatusNotFound, respMissing.StatusCode)

	// Owner can deactivate their own device
	ownerApp := setupNotificationTestApp(repo, "owner-user")
	reqOwner := httptest.NewRequest(http.MethodDelete, "/api/v1/devices/dev-1", nil)
	respOwner, err := ownerApp.Test(reqOwner)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, respOwner.StatusCode)
	require.False(t, repo.devices["dev-1"].IsActive)
}

func TestNotificationHandler_MarkRead_IDOR(t *testing.T) {
	repo := newStubNotificationRepo()
	repo.notifications["notif-1"] = &domain.Notification{
		ID:     "notif-1",
		UserID: "owner-user",
		Type:   "workout",
		Title:  "Workout",
		Read:   false,
	}

	// Attacker cannot mark owner's notification as read
	attackerApp := setupNotificationTestApp(repo, "attacker-user")
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/notifications/notif-1/read", nil)
	resp, err := attackerApp.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, resp.StatusCode)
	require.False(t, repo.notifications["notif-1"].Read)

	// Missing notification returns 404
	reqMissing := httptest.NewRequest(http.MethodPatch, "/api/v1/notifications/notif-missing/read", nil)
	respMissing, err := attackerApp.Test(reqMissing)
	require.NoError(t, err)
	require.Equal(t, http.StatusNotFound, respMissing.StatusCode)

	// Owner can mark their own notification as read
	ownerApp := setupNotificationTestApp(repo, "owner-user")
	reqOwner := httptest.NewRequest(http.MethodPatch, "/api/v1/notifications/notif-1/read", nil)
	respOwner, err := ownerApp.Test(reqOwner)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, respOwner.StatusCode)
	require.True(t, repo.notifications["notif-1"].Read)
}
