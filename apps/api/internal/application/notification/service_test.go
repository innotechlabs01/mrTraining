package notification

import (
	"context"
	"testing"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
)

// mockRepository is an in-memory implementation of notification.Repository for testing.
type mockRepository struct {
	devices       map[string]*domain.Device
	notifications map[string]*domain.Notification
	preferences   map[string]*domain.NotificationPreference
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		devices:       make(map[string]*domain.Device),
		notifications: make(map[string]*domain.Notification),
		preferences:   make(map[string]*domain.NotificationPreference),
	}
}

func (m *mockRepository) RegisterDevice(_ context.Context, d *domain.Device) error {
	m.devices[d.ID] = d
	return nil
}

func (m *mockRepository) GetDevice(_ context.Context, id string) (*domain.Device, error) {
	if d, ok := m.devices[id]; ok {
		return d, nil
	}
	return nil, nil
}

func (m *mockRepository) GetDeviceByToken(_ context.Context, token string) (*domain.Device, error) {
	for _, d := range m.devices {
		if d.Token == token {
			return d, nil
		}
	}
	return nil, nil
}

func (m *mockRepository) ListDevicesByUser(_ context.Context, userID string) ([]*domain.Device, error) {
	var result []*domain.Device
	for _, d := range m.devices {
		if d.UserID == userID && d.IsActive {
			result = append(result, d)
		}
	}
	return result, nil
}

func (m *mockRepository) DeactivateDevice(_ context.Context, id string) error {
	if d, ok := m.devices[id]; ok {
		d.IsActive = false
	}
	return nil
}

func (m *mockRepository) SaveNotification(_ context.Context, n *domain.Notification) error {
	m.notifications[n.ID] = n
	return nil
}

func (m *mockRepository) GetNotification(_ context.Context, id string) (*domain.Notification, error) {
	if n, ok := m.notifications[id]; ok {
		return n, nil
	}
	return nil, nil
}

func (m *mockRepository) ListNotificationsByUser(_ context.Context, userID string, limit, offset int) ([]*domain.Notification, error) {
	var result []*domain.Notification
	for _, n := range m.notifications {
		if n.UserID == userID {
			result = append(result, n)
		}
	}
	if offset >= len(result) {
		return []*domain.Notification{}, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (m *mockRepository) CountNotificationsByUser(_ context.Context, userID string) (int, error) {
	count := 0
	for _, n := range m.notifications {
		if n.UserID == userID {
			count++
		}
	}
	return count, nil
}

func (m *mockRepository) MarkNotificationRead(_ context.Context, id string) error {
	if n, ok := m.notifications[id]; ok {
		n.Read = true
	}
	return nil
}

func (m *mockRepository) MarkAllNotificationsRead(_ context.Context, userID string) (int64, error) {
	var count int64
	for _, n := range m.notifications {
		if n.UserID == userID && !n.Read {
			n.Read = true
			count++
		}
	}
	return count, nil
}

func (m *mockRepository) GetPreferences(_ context.Context, userID string) (*domain.NotificationPreference, error) {
	if p, ok := m.preferences[userID]; ok {
		return p, nil
	}
	return &domain.NotificationPreference{
		UserID:           userID,
		WorkoutReminders: true,
		WeeklyChallenges: true,
		NewArticles:      true,
		CommunityUpdates: true,
		ProgressReports:  true,
	}, nil
}

func (m *mockRepository) UpdatePreferences(_ context.Context, p *domain.NotificationPreference) error {
	m.preferences[p.UserID] = p
	return nil
}

// --- Tests ---

func TestService_RegisterDevice(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	device, err := svc.RegisterDevice(ctx, "user-1", "token-abc", "ios")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if device.UserID != "user-1" {
		t.Errorf("expected user_id=user-1, got %s", device.UserID)
	}
	if device.Token != "token-abc" {
		t.Errorf("expected token=token-abc, got %s", device.Token)
	}
	if device.Platform != "ios" {
		t.Errorf("expected platform=ios, got %s", device.Platform)
	}
	if !device.IsActive {
		t.Error("expected device to be active")
	}
}

func TestService_RegisterDevice_DuplicateToken(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	// Register first time
	_, err := svc.RegisterDevice(ctx, "user-1", "token-abc", "ios")
	if err != nil {
		t.Fatalf("unexpected error on first register: %v", err)
	}

	// Register same token again — should update, not create duplicate
	device, err := svc.RegisterDevice(ctx, "user-1", "token-abc", "android")
	if err != nil {
		t.Fatalf("unexpected error on second register: %v", err)
	}

	if device.Platform != "android" {
		t.Errorf("expected platform to be updated to android, got %s", device.Platform)
	}
}

func TestService_RemoveDevice(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	// Register a device first
	device, _ := svc.RegisterDevice(ctx, "user-1", "token-abc", "ios")

	// Remove it
	err := svc.RemoveDevice(ctx, device.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify it's inactive
	d, _ := repo.GetDevice(ctx, device.ID)
	if d.IsActive {
		t.Error("expected device to be inactive after removal")
	}
}

func TestService_ListDevices(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	// Register two devices for user-1
	svc.RegisterDevice(ctx, "user-1", "token-1", "ios")
	svc.RegisterDevice(ctx, "user-1", "token-2", "android")

	// Register one device for user-2
	svc.RegisterDevice(ctx, "user-2", "token-3", "web")

	devices, err := svc.ListDevices(ctx, "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(devices) != 2 {
		t.Errorf("expected 2 devices for user-1, got %d", len(devices))
	}
}

func TestService_SendNotification(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	notif, err := svc.SendNotification(ctx, "user-1", "workout", "Time to train!", "Your workout is ready", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if notif.UserID != "user-1" {
		t.Errorf("expected user_id=user-1, got %s", notif.UserID)
	}
	if notif.Type != "workout" {
		t.Errorf("expected type=workout, got %s", notif.Type)
	}
	if notif.Title != "Time to train!" {
		t.Errorf("expected title='Time to train!', got %s", notif.Title)
	}
	if notif.Read {
		t.Error("expected notification to be unread")
	}
}

func TestService_GetNotifications(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	// Send 3 notifications
	svc.SendNotification(ctx, "user-1", "workout", "Title 1", "Body 1", "")
	svc.SendNotification(ctx, "user-1", "system", "Title 2", "Body 2", "")
	svc.SendNotification(ctx, "user-1", "challenge", "Title 3", "Body 3", "")

	notifications, total, err := svc.GetNotifications(ctx, "user-1", 1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if total != 3 {
		t.Errorf("expected total=3, got %d", total)
	}
	if len(notifications) != 3 {
		t.Errorf("expected 3 notifications, got %d", len(notifications))
	}
}

func TestService_MarkRead(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	notif, _ := svc.SendNotification(ctx, "user-1", "workout", "Title", "Body", "")

	err := svc.MarkRead(ctx, notif.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	n, _ := repo.GetNotification(ctx, notif.ID)
	if !n.Read {
		t.Error("expected notification to be marked as read")
	}
}

func TestService_MarkAllRead(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	svc.SendNotification(ctx, "user-1", "workout", "Title 1", "Body 1", "")
	svc.SendNotification(ctx, "user-1", "system", "Title 2", "Body 2", "")

	count, err := svc.MarkAllRead(ctx, "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if count != 2 {
		t.Errorf("expected 2 notifications marked, got %d", count)
	}
}

func TestService_GetPreferences_Defaults(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	pref, err := svc.GetPreferences(ctx, "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !pref.WorkoutReminders {
		t.Error("expected default WorkoutReminders to be true")
	}
	if !pref.WeeklyChallenges {
		t.Error("expected default WeeklyChallenges to be true")
	}
}

func TestService_UpdatePreferences(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo, nil)

	ctx := context.Background()

	pref := &domain.NotificationPreference{
		UserID:           "user-1",
		WorkoutReminders: false,
		WeeklyChallenges: true,
		NewArticles:      false,
		CommunityUpdates: true,
		ProgressReports:  false,
	}

	err := svc.UpdatePreferences(ctx, pref)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	updated, _ := svc.GetPreferences(ctx, "user-1")
	if updated.WorkoutReminders {
		t.Error("expected WorkoutReminders to be false after update")
	}
	if updated.WeeklyChallenges != true {
		t.Error("expected WeeklyChallenges to remain true")
	}
}
