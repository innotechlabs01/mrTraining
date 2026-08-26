// Package notification provides the application service layer for the notification domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package notification

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	fcm "github.com/innotechlabs01/mr-training-api/internal/infrastructure/firebase"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
)

// Service implements notification-related business operations.
// It depends on the notification.Repository interface and an optional FCMSender,
// making it testable with mocks.
type Service struct {
	repo     domain.Repository
	fcm      *fcm.FCMSender
}

// NewService creates a new notification application service.
// The fcmSender parameter is optional — pass nil to disable push notifications.
func NewService(repo domain.Repository, fcmSender *fcm.FCMSender) *Service {
	return &Service{repo: repo, fcm: fcmSender}
}

// RegisterDevice registers a device token for push notifications.
// If the token already exists for this user, it updates the platform and reactivates.
func (s *Service) RegisterDevice(ctx context.Context, userID, token, platform string) (*domain.Device, error) {
	// Check if device already exists for this token
	existing, err := s.repo.GetDeviceByToken(ctx, token)
	if err == nil && existing != nil {
		// Token already registered — update platform if changed
		existing.Platform = platform
		existing.IsActive = true
		return existing, nil
	}

	device := &domain.Device{
		ID:       uuid.New().String(),
		UserID:   userID,
		Token:    token,
		Platform: platform,
		IsActive: true,
	}

	if err := s.repo.RegisterDevice(ctx, device); err != nil {
		return nil, fmt.Errorf("register device: %w", err)
	}

	return device, nil
}

// RemoveDevice deactivates a device token so it no longer receives push notifications.
func (s *Service) RemoveDevice(ctx context.Context, deviceID string) error {
	if err := s.repo.DeactivateDevice(ctx, deviceID); err != nil {
		return fmt.Errorf("remove device: %w", err)
	}
	return nil
}

// ListDevices returns all active devices for a user.
func (s *Service) ListDevices(ctx context.Context, userID string) ([]*domain.Device, error) {
	devices, err := s.repo.ListDevicesByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list devices: %w", err)
	}
	return devices, nil
}

// SendNotification persists a notification and optionally pushes it via FCM.
// If FCM is not configured, the notification is still saved to the database.
func (s *Service) SendNotification(ctx context.Context, userID string, notifType, title, message, icon string) (*domain.Notification, error) {
	notification := &domain.Notification{
		ID:     uuid.New().String(),
		UserID: userID,
		Type:   notifType,
		Title:  title,
		Message: message,
		Icon:   icon,
		Read:   false,
	}

	// Persist to database
	if err := s.repo.SaveNotification(ctx, notification); err != nil {
		return nil, fmt.Errorf("save notification: %w", err)
	}

	// Push via FCM if configured
	if s.fcm != nil {
		devices, err := s.repo.ListDevicesByUser(ctx, userID)
		if err == nil && len(devices) > 0 {
			var tokens []string
			for _, d := range devices {
				tokens = append(tokens, d.Token)
			}
			// Fire-and-forget: log errors but don't fail the request
			_ = s.fcm.SendToMultiple(ctx, tokens, title, message, map[string]string{
				"notification_id": notification.ID,
				"type":            notifType,
			})
		}
	}

	return notification, nil
}

// GetNotifications returns paginated notifications for a user.
func (s *Service) GetNotifications(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error) {
	offset := (page - 1) * limit

	notifications, err := s.repo.ListNotificationsByUser(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("get notifications: %w", err)
	}

	total, err := s.repo.CountNotificationsByUser(ctx, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("count notifications: %w", err)
	}

	return notifications, total, nil
}

// MarkRead marks a single notification as read.
func (s *Service) MarkRead(ctx context.Context, notificationID string) error {
	if err := s.repo.MarkNotificationRead(ctx, notificationID); err != nil {
		return fmt.Errorf("mark read: %w", err)
	}
	return nil
}

// MarkAllRead marks all notifications for a user as read.
func (s *Service) MarkAllRead(ctx context.Context, userID string) (int64, error) {
	count, err := s.repo.MarkAllNotificationsRead(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("mark all read: %w", err)
	}
	return count, nil
}

// GetPreferences returns notification preferences for a user.
func (s *Service) GetPreferences(ctx context.Context, userID string) (*domain.NotificationPreference, error) {
	pref, err := s.repo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get preferences: %w", err)
	}
	return pref, nil
}

// UpdatePreferences saves notification preferences for a user.
func (s *Service) UpdatePreferences(ctx context.Context, pref *domain.NotificationPreference) error {
	if err := s.repo.UpdatePreferences(ctx, pref); err != nil {
		return fmt.Errorf("update preferences: %w", err)
	}
	return nil
}
