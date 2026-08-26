package notification

import (
	"context"
	"database/sql"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements notification.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new notification repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// --- Device operations ---

// RegisterDevice stores a new device token for push notifications.
func (r *Repository) RegisterDevice(ctx context.Context, d *domain.Device) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO devices (id, user_id, token, platform, is_active, created_at)
		 VALUES (?, ?, ?, ?, ?, datetime('now'))`,
		d.ID, d.UserID, d.Token, d.Platform, d.IsActive)
	if err != nil {
		return fmt.Errorf("failed to register device: %w", err)
	}
	return nil
}

// GetDevice retrieves a device by its unique identifier.
func (r *Repository) GetDevice(ctx context.Context, id string) (*domain.Device, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, token, platform, is_active, created_at
		 FROM devices WHERE id = ?`, id)

	d := &domain.Device{}
	err := row.Scan(&d.ID, &d.UserID, &d.Token, &d.Platform, &d.IsActive, &d.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Device", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}
	return d, nil
}

// GetDeviceByToken retrieves a device by its FCM token.
func (r *Repository) GetDeviceByToken(ctx context.Context, token string) (*domain.Device, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, token, platform, is_active, created_at
		 FROM devices WHERE token = ?`, token)

	d := &domain.Device{}
	err := row.Scan(&d.ID, &d.UserID, &d.Token, &d.Platform, &d.IsActive, &d.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Device", "token")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get device by token: %w", err)
	}
	return d, nil
}

// ListDevicesByUser retrieves all active devices for a user.
func (r *Repository) ListDevicesByUser(ctx context.Context, userID string) ([]*domain.Device, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, token, platform, is_active, created_at
		 FROM devices WHERE user_id = ? AND is_active = 1`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list devices: %w", err)
	}
	defer rows.Close()

	var devices []*domain.Device
	for rows.Next() {
		d := &domain.Device{}
		if err := rows.Scan(&d.ID, &d.UserID, &d.Token, &d.Platform, &d.IsActive, &d.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan device: %w", err)
		}
		devices = append(devices, d)
	}
	return devices, nil
}

// DeactivateDevice marks a device as inactive.
func (r *Repository) DeactivateDevice(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE devices SET is_active = 0 WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to deactivate device: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Device", id)
	}
	return nil
}

// --- Notification operations ---

// SaveNotification persists a notification record.
func (r *Repository) SaveNotification(ctx context.Context, n *domain.Notification) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO notifications (id, user_id, type, title, message, icon, is_read, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		n.ID, n.UserID, n.Type, n.Title, n.Message, nullStr(n.Icon), n.Read)
	if err != nil {
		return fmt.Errorf("failed to save notification: %w", err)
	}
	return nil
}

// GetNotification retrieves a notification by its unique identifier.
func (r *Repository) GetNotification(ctx context.Context, id string) (*domain.Notification, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, type, title, message, icon, is_read, created_at
		 FROM notifications WHERE id = ?`, id)

	n := &domain.Notification{}
	var icon sql.NullString
	err := row.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &icon, &n.Read, &n.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Notification", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}
	if icon.Valid {
		n.Icon = icon.String
	}
	return n, nil
}

// ListNotificationsByUser retrieves notifications for a user, ordered by creation date descending.
func (r *Repository) ListNotificationsByUser(ctx context.Context, userID string, limit, offset int) ([]*domain.Notification, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, type, title, message, icon, is_read, created_at
		 FROM notifications WHERE user_id = ?
		 ORDER BY created_at DESC LIMIT ? OFFSET ?`, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list notifications: %w", err)
	}
	defer rows.Close()

	var notifications []*domain.Notification
	for rows.Next() {
		n := &domain.Notification{}
		var icon sql.NullString
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &icon, &n.Read, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan notification: %w", err)
		}
		if icon.Valid {
			n.Icon = icon.String
		}
		notifications = append(notifications, n)
	}
	return notifications, nil
}

// CountNotificationsByUser returns the total number of notifications for a user.
func (r *Repository) CountNotificationsByUser(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = ?`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count notifications: %w", err)
	}
	return count, nil
}

// MarkNotificationRead marks a single notification as read.
func (r *Repository) MarkNotificationRead(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET is_read = 1 WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to mark notification read: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Notification", id)
	}
	return nil
}

// MarkAllNotificationsRead marks all notifications for a user as read.
func (r *Repository) MarkAllNotificationsRead(ctx context.Context, userID string) (int64, error) {
	result, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to mark all notifications read: %w", err)
	}
	return result.RowsAffected()
}

// --- Preference operations ---

// GetPreferences retrieves notification preferences for a user.
// Returns default preferences if none exist.
func (r *Repository) GetPreferences(ctx context.Context, userID string) (*domain.NotificationPreference, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT user_id, workout_reminders, weekly_challenges, new_articles, community_updates, progress_reports
		 FROM notification_preferences WHERE user_id = ?`, userID)

	p := &domain.NotificationPreference{}
	err := row.Scan(&p.UserID, &p.WorkoutReminders, &p.WeeklyChallenges,
		&p.NewArticles, &p.CommunityUpdates, &p.ProgressReports)
	if err == sql.ErrNoRows {
		// Return defaults
		return &domain.NotificationPreference{
			UserID:           userID,
			WorkoutReminders: true,
			WeeklyChallenges: true,
			NewArticles:      true,
			CommunityUpdates: true,
			ProgressReports:  true,
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get preferences: %w", err)
	}
	return p, nil
}

// UpdatePreferences saves notification preferences for a user.
func (r *Repository) UpdatePreferences(ctx context.Context, p *domain.NotificationPreference) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO notification_preferences (user_id, workout_reminders, weekly_challenges, new_articles, community_updates, progress_reports)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(user_id) DO UPDATE SET
		 workout_reminders = excluded.workout_reminders,
		 weekly_challenges = excluded.weekly_challenges,
		 new_articles = excluded.new_articles,
		 community_updates = excluded.community_updates,
		 progress_reports = excluded.progress_reports`,
		p.UserID, p.WorkoutReminders, p.WeeklyChallenges, p.NewArticles, p.CommunityUpdates, p.ProgressReports)
	if err != nil {
		return fmt.Errorf("failed to update preferences: %w", err)
	}
	return nil
}

// nullStr converts an empty string to sql.NullString with Valid=false.
func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
