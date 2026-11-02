// Package notification defines the core notification domain entities for the MR Training API.
// It includes Device, Notification, and NotificationPreference types for push notifications via FCM.
package notification

// Device represents a registered device for push notifications.
// Each device stores a Firebase Cloud Messaging token tied to a user and platform.
type Device struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Token     string `json:"token"`
	Platform  string `json:"platform"` // "ios", "android", "web"
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

// Notification represents an in-app and push notification sent to a user.
// Notifications are persisted in the database and optionally pushed via FCM.
type Notification struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Type      string `json:"type"` // "reminder", "system", "workout", "challenge"
	Title     string `json:"title"`
	Message   string `json:"message"`
	Icon      string `json:"icon,omitempty"`
	Read      bool   `json:"read"`
	CreatedAt string `json:"created_at"`
}

// NotificationPreference stores per-user notification opt-in/out settings.
type NotificationPreference struct {
	UserID             string `json:"user_id"`
	WorkoutReminders   bool   `json:"workout_reminders"`
	WeeklyChallenges   bool   `json:"weekly_challenges"`
	NewArticles        bool   `json:"new_articles"`
	CommunityUpdates   bool   `json:"community_updates"`
	ProgressReports    bool   `json:"progress_reports"`
}
