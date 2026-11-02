package notification

import "context"

// Repository defines the data access interface for the notification domain.
// Implementations can use any data store (Turso, Postgres, in-memory, etc.).
type Repository interface {
	// Device operations

	// RegisterDevice stores a new device token for push notifications.
	// Returns an error if the device already exists or on database failure.
	RegisterDevice(ctx context.Context, device *Device) error

	// GetDevice retrieves a device by its unique identifier.
	// Returns ErrNotFound if no device exists with the given ID.
	GetDevice(ctx context.Context, id string) (*Device, error)

	// GetDeviceByToken retrieves a device by its FCM token.
	// Returns ErrNotFound if no device exists with the given token.
	GetDeviceByToken(ctx context.Context, token string) (*Device, error)

	// ListDevicesByUser retrieves all active devices for a user.
	// Returns an empty slice (not nil) if no devices exist.
	ListDevicesByUser(ctx context.Context, userID string) ([]*Device, error)

	// DeactivateDevice marks a device as inactive.
	// Returns an error if the device does not exist or on database failure.
	DeactivateDevice(ctx context.Context, id string) error

	// Notification operations

	// SaveNotification persists a notification record.
	SaveNotification(ctx context.Context, n *Notification) error

	// GetNotification retrieves a notification by its unique identifier.
	// Returns ErrNotFound if no notification exists with the given ID.
	GetNotification(ctx context.Context, id string) (*Notification, error)

	// ListNotificationsByUser retrieves notifications for a user, ordered by creation date descending.
	// Supports offset-based pagination via limit and offset.
	ListNotificationsByUser(ctx context.Context, userID string, limit, offset int) ([]*Notification, error)

	// CountNotificationsByUser returns the total number of notifications for a user.
	CountNotificationsByUser(ctx context.Context, userID string) (int, error)

	// MarkNotificationRead marks a single notification as read.
	// Returns an error if the notification does not exist or on database failure.
	MarkNotificationRead(ctx context.Context, id string) error

	// MarkAllNotificationsRead marks all notifications for a user as read.
	// Returns the number of notifications updated.
	MarkAllNotificationsRead(ctx context.Context, userID string) (int64, error)

	// Preference operations

	// GetPreferences retrieves notification preferences for a user.
	// Returns default preferences if none exist.
	GetPreferences(ctx context.Context, userID string) (*NotificationPreference, error)

	// UpdatePreferences saves notification preferences for a user.
	UpdatePreferences(ctx context.Context, pref *NotificationPreference) error
}
