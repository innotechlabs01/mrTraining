package dto

// --- Notification Request DTOs ---

// RegisterDeviceRequest is the payload for registering a push notification device.
type RegisterDeviceRequest struct {
	// Token is the FCM device token.
	Token string `json:"token"`
	// Platform must be one of: "ios", "android", "web".
	Platform string `json:"platform"`
}

// SendNotificationRequest is the payload for sending a notification to a user (admin/system use).
type SendNotificationRequest struct {
	// UserID is the target user for the notification.
	UserID string `json:"user_id"`
	// Type must be one of: "reminder", "system", "workout", "challenge".
	Type string `json:"type"`
	// Title is the notification title (1-255 characters).
	Title string `json:"title"`
	// Message is the notification body (1-2000 characters).
	Message string `json:"message"`
	// Icon is an optional icon URL or identifier.
	Icon string `json:"icon"`
}

// UpdateNotificationPreferencesRequest is the payload for updating notification preferences.
type UpdateNotificationPreferencesRequest struct {
	WorkoutReminders *bool `json:"workout_reminders"`
	WeeklyChallenges *bool `json:"weekly_challenges"`
	NewArticles      *bool `json:"new_articles"`
	CommunityUpdates *bool `json:"community_updates"`
	ProgressReports  *bool `json:"progress_reports"`
}

// --- Notification Response DTOs ---

// DeviceResponse represents a registered device in API responses.
type DeviceResponse struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Platform  string `json:"platform"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

// NotificationResponse represents a notification in API responses.
type NotificationResponse struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	Icon      string `json:"icon,omitempty"`
	Read      bool   `json:"read"`
	CreatedAt string `json:"created_at"`
}

// NotificationPreferencesResponse represents notification preferences in API responses.
type NotificationPreferencesResponse struct {
	WorkoutReminders bool `json:"workout_reminders"`
	WeeklyChallenges bool `json:"weekly_challenges"`
	NewArticles      bool `json:"new_articles"`
	CommunityUpdates bool `json:"community_updates"`
	ProgressReports  bool `json:"progress_reports"`
}
