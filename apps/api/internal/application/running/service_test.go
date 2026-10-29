package running

import (
	"context"
	"fmt"
	"testing"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
)

// mockRepository is an in-memory implementation of running.Repository for testing.
type mockRepository struct {
	sessions       map[string]*domain.RunningSession
	sessionDevices map[string]*domain.RunningSession // keyed by user_id|external_id
	connections    map[string]*domain.DeviceConnection
	gpsPoints      map[string][]*domain.GpsPoint // keyed by session_id
	templates      map[string]*domain.RunningWorkoutTemplate
	segments       map[string][]*domain.RunningWorkoutSegment // keyed by template_id
	assignments    map[string]*domain.RunningWorkoutAssignment
	snapshots      map[string]*domain.RunningWorkoutSnapshot  // keyed by session_id
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		sessions:    make(map[string]*domain.RunningSession),
		connections: make(map[string]*domain.DeviceConnection),
		gpsPoints:   make(map[string][]*domain.GpsPoint),
		templates:   make(map[string]*domain.RunningWorkoutTemplate),
		segments:    make(map[string][]*domain.RunningWorkoutSegment),
		assignments: make(map[string]*domain.RunningWorkoutAssignment),
		snapshots:   make(map[string]*domain.RunningWorkoutSnapshot),
	}
}

func (m *mockRepository) SaveSession(_ context.Context, s *domain.RunningSession) error {
	m.sessions[s.ID] = s
	return nil
}

func (m *mockRepository) GetSession(_ context.Context, id string) (*domain.RunningSession, error) {
	if s, ok := m.sessions[id]; ok {
		return s, nil
	}
	return nil, nil
}

func (m *mockRepository) ListSessionsByUser(_ context.Context, userID string, fromDate, toDate string, limit, offset int) ([]*domain.RunningSession, error) {
	var result []*domain.RunningSession
	for _, s := range m.sessions {
		if s.UserID == userID {
			if fromDate != "" && s.Date < fromDate {
				continue
			}
			if toDate != "" && s.Date > toDate {
				continue
			}
			result = append(result, s)
		}
	}
	if offset >= len(result) {
		return []*domain.RunningSession{}, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (m *mockRepository) CountSessionsByUser(_ context.Context, userID string, fromDate, toDate string) (int, error) {
	count := 0
	for _, s := range m.sessions {
		if s.UserID == userID {
			if fromDate != "" && s.Date < fromDate {
				continue
			}
			if toDate != "" && s.Date > toDate {
				continue
			}
			count++
		}
	}
	return count, nil
}

func (m *mockRepository) UpdateSession(_ context.Context, s *domain.RunningSession) error {
	if _, ok := m.sessions[s.ID]; !ok {
		return nil
	}
	m.sessions[s.ID] = s
	return nil
}

func (m *mockRepository) DeleteSession(_ context.Context, id string) error {
	delete(m.sessions, id)
	return nil
}

func (m *mockRepository) SaveDeviceConnection(_ context.Context, c *domain.DeviceConnection) error {
	m.connections[c.ID] = c
	return nil
}

func (m *mockRepository) GetDeviceConnection(_ context.Context, id string) (*domain.DeviceConnection, error) {
	if c, ok := m.connections[id]; ok {
		return c, nil
	}
	return nil, nil
}

func (m *mockRepository) ListDeviceConnectionsByUser(_ context.Context, userID string) ([]*domain.DeviceConnection, error) {
	var result []*domain.DeviceConnection
	for _, c := range m.connections {
		if c.UserID == userID {
			result = append(result, c)
		}
	}
	return result, nil
}

func (m *mockRepository) DeactivateDeviceConnection(_ context.Context, id string) error {
	if c, ok := m.connections[id]; ok {
		c.IsActive = false
	}
	return nil
}

func (m *mockRepository) SaveSessionDevice(_ context.Context, s *domain.RunningSession) error {
	if m.sessionDevices == nil {
		m.sessionDevices = make(map[string]*domain.RunningSession)
	}
	m.sessionDevices[s.UserID+"|"+s.ExternalID] = s
	return nil
}

func (m *mockRepository) GetSessionIDByExternalID(_ context.Context, userID, externalID string) (string, bool, error) {
	if s, ok := m.sessionDevices[userID+"|"+externalID]; ok {
		return s.ID, true, nil
	}
	return "", false, nil
}

func (m *mockRepository) SaveGpsPoint(_ context.Context, p *domain.GpsPoint) error {
	m.gpsPoints[p.SessionID] = append(m.gpsPoints[p.SessionID], p)
	return nil
}

func (m *mockRepository) SaveGpsPoints(_ context.Context, points []*domain.GpsPoint) error {
	for _, p := range points {
		m.gpsPoints[p.SessionID] = append(m.gpsPoints[p.SessionID], p)
	}
	return nil
}

func (m *mockRepository) ListGpsPointsBySession(_ context.Context, sessionID string) ([]*domain.GpsPoint, error) {
	pts, ok := m.gpsPoints[sessionID]
	if !ok {
		return []*domain.GpsPoint{}, nil
	}
	return pts, nil
}

// --- Running workout template operations (mock) ---

func (m *mockRepository) SaveTemplate(_ context.Context, t *domain.RunningWorkoutTemplate) error {
	if t.ID == "" {
		t.ID = "template-" + fmt.Sprintf("%d", len(m.templates)+1)
	}
	m.templates[t.ID] = t
	return nil
}

func (m *mockRepository) GetTemplate(_ context.Context, id string) (*domain.RunningWorkoutTemplate, error) {
	if t, ok := m.templates[id]; ok {
		return t, nil
	}
	return nil, nil
}

func (m *mockRepository) ListTemplatesByCoach(_ context.Context, coachID string) ([]*domain.RunningWorkoutTemplate, error) {
	var result []*domain.RunningWorkoutTemplate
	for _, t := range m.templates {
		if t.CoachID == coachID {
			result = append(result, t)
		}
	}
	if result == nil {
		result = []*domain.RunningWorkoutTemplate{}
	}
	return result, nil
}

func (m *mockRepository) DeleteTemplate(_ context.Context, id string) error {
	delete(m.templates, id)
	return nil
}

// --- Running workout segment operations (mock) ---

func (m *mockRepository) SaveSegment(_ context.Context, s *domain.RunningWorkoutSegment) error {
	if s.ID == "" {
		s.ID = "segment-" + fmt.Sprintf("%d", len(m.segments[s.TemplateID])+1)
	}
	m.segments[s.TemplateID] = append(m.segments[s.TemplateID], s)
	return nil
}

func (m *mockRepository) ListSegmentsByTemplate(_ context.Context, templateID string) ([]*domain.RunningWorkoutSegment, error) {
	segs, ok := m.segments[templateID]
	if !ok {
		return []*domain.RunningWorkoutSegment{}, nil
	}
	return segs, nil
}

// --- Running workout assignment operations (mock) ---

func (m *mockRepository) SaveAssignment(_ context.Context, a *domain.RunningWorkoutAssignment) error {
	if a.ID == "" {
		a.ID = "assignment-" + fmt.Sprintf("%d", len(m.assignments)+1)
	}
	m.assignments[a.ID] = a
	return nil
}

func (m *mockRepository) GetAssignment(_ context.Context, id string) (*domain.RunningWorkoutAssignment, error) {
	if a, ok := m.assignments[id]; ok {
		return a, nil
	}
	return nil, nil
}

func (m *mockRepository) ListAssignmentsByAthlete(_ context.Context, athleteID string, status domain.RunningWorkoutAssignmentStatus) ([]*domain.RunningWorkoutAssignment, error) {
	var result []*domain.RunningWorkoutAssignment
	for _, a := range m.assignments {
		if a.AthleteID == athleteID && (status == "" || a.Status == status) {
			result = append(result, a)
		}
	}
	if result == nil {
		result = []*domain.RunningWorkoutAssignment{}
	}
	return result, nil
}

func (m *mockRepository) ListAssignmentsByCoach(_ context.Context, coachID string) ([]*domain.RunningWorkoutAssignment, error) {
	var result []*domain.RunningWorkoutAssignment
	for _, a := range m.assignments {
		if a.CoachID == coachID {
			result = append(result, a)
		}
	}
	if result == nil {
		result = []*domain.RunningWorkoutAssignment{}
	}
	return result, nil
}

func (m *mockRepository) UpdateAssignmentStatus(_ context.Context, id string, status domain.RunningWorkoutAssignmentStatus) error {
	if a, ok := m.assignments[id]; ok {
		a.Status = status
	}
	return nil
}

// --- Running workout snapshot operations (mock) ---

func (m *mockRepository) SaveSnapshot(_ context.Context, s *domain.RunningWorkoutSnapshot) error {
	if s.ID == "" {
		s.ID = "snapshot-" + fmt.Sprintf("%d", len(m.snapshots)+1)
	}
	m.snapshots[s.SessionID] = s
	return nil
}

func (m *mockRepository) GetSnapshotBySession(_ context.Context, sessionID string) (*domain.RunningWorkoutSnapshot, error) {
	if s, ok := m.snapshots[sessionID]; ok {
		return s, nil
	}
	return nil, nil
}

// --- Tests ---

func TestService_LogRunningSession(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	session := &domain.RunningSession{
		UserID:   "user-1",
		Date:     "2026-08-25",
		Distance: 5.0,
		Duration: 1500, // 25 minutes
		Calories: 350,
		Source:   "manual",
	}

	err := svc.LogRunningSession(ctx, session)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if session.ID == "" {
		t.Error("expected session ID to be generated")
	}
	if session.Speed <= 0 {
		t.Errorf("expected speed to be calculated, got %f", session.Speed)
	}

	// Speed = (5.0 / 1500) * 3600 = 12 km/h
	expectedSpeed := 12.0
	if session.Speed != expectedSpeed {
		t.Errorf("expected speed=%.1f, got %.1f", expectedSpeed, session.Speed)
	}
}

func TestService_LogRunningSession_DefaultSource(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	session := &domain.RunningSession{
		UserID:   "user-1",
		Date:     "2026-08-25",
		Distance: 3.0,
		Duration: 1200,
	}

	err := svc.LogRunningSession(ctx, session)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if session.Source != "manual" {
		t.Errorf("expected default source='manual', got %s", session.Source)
	}
}

func TestService_GetRunningHistory(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	// Log 3 sessions
	for i := 0; i < 3; i++ {
		svc.LogRunningSession(ctx, &domain.RunningSession{
			UserID:   "user-1",
			Date:     "2026-08-25",
			Distance: 5.0,
			Duration: 1500,
		})
	}

	sessions, total, err := svc.GetRunningHistory(ctx, "user-1", "", "", 1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if total != 3 {
		t.Errorf("expected total=3, got %d", total)
	}
	if len(sessions) != 3 {
		t.Errorf("expected 3 sessions, got %d", len(sessions))
	}
}

func TestService_GetRunningHistory_DateFilter(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	svc.LogRunningSession(ctx, &domain.RunningSession{
		UserID: "user-1", Date: "2026-08-01", Distance: 5.0, Duration: 1500,
	})
	svc.LogRunningSession(ctx, &domain.RunningSession{
		UserID: "user-1", Date: "2026-08-25", Distance: 10.0, Duration: 3000,
	})

	sessions, total, err := svc.GetRunningHistory(ctx, "user-1", "2026-08-10", "", 1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if total != 1 {
		t.Errorf("expected total=1 for date filter, got %d", total)
	}
	if len(sessions) != 1 {
		t.Errorf("expected 1 session, got %d", len(sessions))
	}
}

func TestService_GetRunningStats(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	svc.LogRunningSession(ctx, &domain.RunningSession{
		UserID: "user-1", Date: "2026-08-01", Distance: 5.0, Duration: 1500, Calories: 350, HeartRate: 140,
	})
	svc.LogRunningSession(ctx, &domain.RunningSession{
		UserID: "user-1", Date: "2026-08-15", Distance: 10.0, Duration: 3000, Calories: 700, HeartRate: 150,
	})

	stats, err := svc.GetRunningStats(ctx, "user-1", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if stats.TotalSessions != 2 {
		t.Errorf("expected 2 sessions, got %d", stats.TotalSessions)
	}
	if stats.TotalDistance != 15.0 {
		t.Errorf("expected total distance=15.0, got %.1f", stats.TotalDistance)
	}
	if stats.TotalCalories != 1050 {
		t.Errorf("expected total calories=1050, got %d", stats.TotalCalories)
	}
	if stats.AvgHeartRate != 145 {
		t.Errorf("expected avg heart rate=145, got %d", stats.AvgHeartRate)
	}
}

func TestService_GetRunningStats_Empty(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	stats, err := svc.GetRunningStats(ctx, "user-1", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if stats.TotalSessions != 0 {
		t.Errorf("expected 0 sessions, got %d", stats.TotalSessions)
	}
}

func TestService_ConnectDevice(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	conn, err := svc.ConnectDevice(ctx, "user-1", "apple_watch")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if conn.UserID != "user-1" {
		t.Errorf("expected user_id=user-1, got %s", conn.UserID)
	}
	if conn.DeviceType != "apple_watch" {
		t.Errorf("expected device_type=apple_watch, got %s", conn.DeviceType)
	}
	if !conn.IsActive {
		t.Error("expected connection to be active")
	}
}

func TestService_ConnectDevice_InvalidType(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	_, err := svc.ConnectDevice(ctx, "user-1", "fitbit")
	if err == nil {
		t.Fatal("expected error for invalid device type")
	}
}

func TestService_DisconnectDevice(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	ctx := context.Background()

	conn, _ := svc.ConnectDevice(ctx, "user-1", "garmin")

	err := svc.DisconnectDevice(ctx, conn.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	c, _ := repo.GetDeviceConnection(ctx, conn.ID)
	if c.IsActive {
		t.Error("expected connection to be inactive after disconnect")
	}
}

func TestService_SaveGpsPointsBatch(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	points := []*domain.GpsPoint{
		{Lat: -34.60, Lng: -58.38, Timestamp: "2026-10-18T10:00:00Z", Accuracy: 5},
		{Lat: -34.61, Lng: -58.39, Timestamp: "2026-10-18T10:00:05Z", Accuracy: 80}, // dropped: >50m
		{Lat: -34.62, Lng: -58.40, Timestamp: "2026-10-18T10:00:10Z"},               // no accuracy: kept
	}

	saved, err := svc.SaveGpsPointsBatch(ctx, "session-1", points)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if saved != 2 {
		t.Errorf("expected 2 saved (1 dropped by accuracy), got %d", saved)
	}
	if len(repo.gpsPoints["session-1"]) != 2 {
		t.Errorf("expected 2 persisted points, got %d", len(repo.gpsPoints["session-1"]))
	}
}

func TestService_SaveGpsPointsBatch_ExceedsCap(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	points := make([]*domain.GpsPoint, 101)
	for i := range points {
		points[i] = &domain.GpsPoint{Lat: 1, Lng: 1, Timestamp: "2026-10-18T10:00:00Z"}
	}

	_, err := svc.SaveGpsPointsBatch(ctx, "session-1", points)
	if err == nil {
		t.Fatal("expected error for batch over 100 points")
	}
}

func TestService_SaveGpsPointsBatch_AssignsIDs(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	points := []*domain.GpsPoint{{Lat: 1, Lng: 1, Timestamp: "2026-10-18T10:00:00Z"}}
	if _, err := svc.SaveGpsPointsBatch(ctx, "s1", points); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if points[0].ID == "" {
		t.Error("expected UUID assigned to point")
	}
	if points[0].SessionID != "s1" {
		t.Errorf("expected session_id forced to s1, got %s", points[0].SessionID)
	}
}

func TestService_UpdateSession_RecalculatesSpeedAndPace(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	session := &domain.RunningSession{ID: "s1", UserID: "user-1", Date: "2026-10-18", Source: "mobile_gps"}
	if err := repo.SaveSession(ctx, session); err != nil {
		t.Fatalf("seed session: %v", err)
	}

	distance, duration := 10.0, 3000 // 10km en 50min → 5:00/km, 12 km/h
	if err := svc.UpdateSession(ctx, &domain.RunningSession{
		ID: "s1", Date: "2026-10-18", Distance: distance, Duration: duration, GPSRoute: "abc~poly",
	}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	updated, _ := repo.GetSession(ctx, "s1")
	if updated.Pace != "5:00" {
		t.Errorf("expected pace 5:00, got %s", updated.Pace)
	}
	if updated.Speed < 11.9 || updated.Speed > 12.1 {
		t.Errorf("expected speed ~12 km/h, got %f", updated.Speed)
	}
	if updated.GPSRoute != "abc~poly" {
		t.Errorf("expected gps route persisted, got %s", updated.GPSRoute)
	}
}

func TestService_DeleteSession(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	_ = repo.SaveSession(ctx, &domain.RunningSession{ID: "s1", UserID: "user-1"})
	if err := svc.DeleteSession(ctx, "s1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := repo.sessions["s1"]; ok {
		t.Error("expected session removed")
	}
}

func TestFormatPace(t *testing.T) {
	tests := []struct {
		distance float64
		duration int
		expected string
	}{
		{5.0, 1500, "5:00"},  // 5km in 25min = 5:00/km
		{10.0, 3000, "5:00"}, // 10km in 50min = 5:00/km
		{5.0, 1650, "5:30"},  // 5km in 27:30 = 5:30/km
		{0, 1500, "0:00"},    // zero distance
		{5.0, 1200, "4:00"},  // 5km in 20min = 4:00/km
	}

	for _, tt := range tests {
		result := formatPace(tt.distance, tt.duration)
		if result != tt.expected {
			t.Errorf("formatPace(%f, %d) = %s, want %s", tt.distance, tt.duration, result, tt.expected)
		}
	}
}

func TestService_ImportDeviceSessions(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	imports := []*ImportedSession{
		{
			ExternalID: "HK-uuid-1",
			Session: domain.RunningSession{
				Date:        "2026-10-17",
				Distance:    10.0,
				Duration:    3000,
				Calories:    620,
				Source:      domain.SourceAppleWatch,
				DeviceName:  "Apple Watch de Juan",
				DeviceBrand: "Apple",
			},
			Points: []*domain.GpsPoint{
				{Lat: -34.60, Lng: -58.38, Timestamp: "2026-10-17T10:00:00Z", Accuracy: 5},
				{Lat: -34.61, Lng: -58.39, Timestamp: "2026-10-17T10:00:05Z", Accuracy: 90}, // dropped
			},
		},
		{
			ExternalID: "garmin-998877",
			Session: domain.RunningSession{
				Date:        "2026-10-16",
				Distance:    5.0,
				Duration:    1500,
				Source:      domain.SourceGarmin,
				DeviceName:  "Forerunner 265",
				DeviceBrand: "Garmin",
			},
		},
		// No external id: cannot be made idempotent, so it is skipped.
		{Session: domain.RunningSession{Date: "2026-10-15", Distance: 3, Duration: 900, Source: domain.SourceAppleWatch}},
		// Unknown source: provenance would be invented.
		{ExternalID: "x", Session: domain.RunningSession{Date: "2026-10-15", Distance: 3, Duration: 900, Source: "manual"}},
	}

	res, err := svc.ImportDeviceSessions(ctx, "user-1", imports)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Imported != 2 {
		t.Fatalf("expected 2 imported, got %d", res.Imported)
	}
	if res.Skipped != 2 {
		t.Fatalf("expected 2 skipped, got %d", res.Skipped)
	}

	first := res.Sessions[0]
	if first.Pace != "5:00" {
		t.Errorf("expected pace 5:00, got %q", first.Pace)
	}
	if first.Speed != 12 {
		t.Errorf("expected speed 12, got %f", first.Speed)
	}
	if first.DeviceName != "Apple Watch de Juan" || first.DeviceBrand != "Apple" {
		t.Errorf("device not preserved: %+v", first)
	}
	if got := len(repo.gpsPoints[first.ID]); got != 1 {
		t.Errorf("expected 1 stored GPS point after accuracy filter, got %d", got)
	}

	// Re-syncing the same window must not duplicate anything.
	again, err := svc.ImportDeviceSessions(ctx, "user-1", imports)
	if err != nil {
		t.Fatalf("unexpected error on re-sync: %v", err)
	}
	if again.Imported != 0 || again.Skipped != 4 {
		t.Fatalf("expected full skip on re-sync, got imported=%d skipped=%d", again.Imported, again.Skipped)
	}
	if len(repo.sessions) != 2 {
		t.Errorf("expected 2 stored sessions, got %d", len(repo.sessions))
	}
}

func TestService_ImportDeviceSessions_RejectsOversizedBatch(t *testing.T) {
	svc := NewService(newMockRepository())
	imports := make([]*ImportedSession, maxImportedSessions+1)
	for i := range imports {
		imports[i] = &ImportedSession{ExternalID: fmt.Sprintf("id-%d", i)}
	}
	if _, err := svc.ImportDeviceSessions(context.Background(), "user-1", imports); err == nil {
		t.Fatal("expected an error for an oversized batch")
	}
}
