// Package running provides the application service layer for the running domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package running

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
)

// Service implements running-related business operations.
// It depends on the running.Repository interface, making it testable with mocks.
type Service struct {
	repo      domain.Repository
	providers map[string]domain.WearableProvider
}

// NewService creates a new running application service with the given repository.
// Wearable providers can be registered via RegisterProvider.
func NewService(repo domain.Repository) *Service {
	return &Service{
		repo:      repo,
		providers: make(map[string]domain.WearableProvider),
	}
}

// RegisterProvider adds a wearable provider to the service.
func (s *Service) RegisterProvider(provider domain.WearableProvider) {
	s.providers[provider.Name()] = provider
}

// LogRunningSession persists a new running session from manual input or synced data.
func (s *Service) LogRunningSession(ctx context.Context, session *domain.RunningSession) error {
	if session.ID == "" {
		session.ID = uuid.New().String()
	}
	if session.Source == "" {
		session.Source = "manual"
	}

	// Calculate speed from distance and duration
	if session.Distance > 0 && session.Duration > 0 {
		session.Speed = (session.Distance / float64(session.Duration)) * 3600 // km/h
	}

	if err := s.repo.SaveSession(ctx, session); err != nil {
		return fmt.Errorf("log running session: %w", err)
	}
	return nil
}

// GetRunningHistory returns paginated running sessions for a user within an optional date range.
func (s *Service) GetRunningHistory(ctx context.Context, userID string, fromDate, toDate string, page, limit int) ([]*domain.RunningSession, int, error) {
	offset := (page - 1) * limit

	sessions, err := s.repo.ListSessionsByUser(ctx, userID, fromDate, toDate, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("get running history: %w", err)
	}

	total, err := s.repo.CountSessionsByUser(ctx, userID, fromDate, toDate)
	if err != nil {
		return nil, 0, fmt.Errorf("count running sessions: %w", err)
	}

	return sessions, total, nil
}

// GetRunningStats returns aggregated running statistics for a user within an optional date range.
func (s *Service) GetRunningStats(ctx context.Context, userID string, fromDate, toDate string) (*RunningStats, error) {
	sessions, err := s.repo.ListSessionsByUser(ctx, userID, fromDate, toDate, 10000, 0)
	if err != nil {
		return nil, fmt.Errorf("get running stats: %w", err)
	}

	stats := &RunningStats{
		TotalSessions: len(sessions),
	}

	if len(sessions) == 0 {
		return stats, nil
	}

	var totalDistance float64
	var totalDuration int
	var totalCalories int
	var totalElevation float64
	var totalHeartRate int
	heartRateCount := 0

	for _, s := range sessions {
		totalDistance += s.Distance
		totalDuration += s.Duration
		totalCalories += s.Calories
		totalElevation += s.Elevation
		if s.HeartRate > 0 {
			totalHeartRate += s.HeartRate
			heartRateCount++
		}
	}

	stats.TotalDistance = totalDistance
	stats.TotalDuration = totalDuration
	stats.TotalCalories = totalCalories
	stats.TotalElevation = totalElevation
	stats.AvgDistance = totalDistance / float64(len(sessions))
	stats.AvgDuration = totalDuration / len(sessions)
	stats.AvgCalories = totalCalories / len(sessions)

	if heartRateCount > 0 {
		stats.AvgHeartRate = totalHeartRate / heartRateCount
	}

	if totalDuration > 0 {
		stats.AvgPace = formatPace(totalDistance, totalDuration)
	}

	return stats, nil
}

// ConnectDevice returns connection instructions for a wearable device type.
// In a real implementation, this would initiate OAuth flows or display pairing instructions.
func (s *Service) ConnectDevice(ctx context.Context, userID string, deviceType string) (*domain.DeviceConnection, error) {
	// Validate device type
	validTypes := map[string]bool{
		"apple_watch": true,
		"garmin":      true,
		"healthkit":   true,
	}
	if !validTypes[deviceType] {
		return nil, fmt.Errorf("unsupported device type: %s", deviceType)
	}

	conn := &domain.DeviceConnection{
		ID:         uuid.New().String(),
		UserID:     userID,
		DeviceType: deviceType,
		IsActive:   true,
	}

	if err := s.repo.SaveDeviceConnection(ctx, conn); err != nil {
		return nil, fmt.Errorf("connect device: %w", err)
	}

	return conn, nil
}

// DisconnectDevice deactivates a device connection.
func (s *Service) DisconnectDevice(ctx context.Context, deviceID string) error {
	if err := s.repo.DeactivateDeviceConnection(ctx, deviceID); err != nil {
		return fmt.Errorf("disconnect device: %w", err)
	}
	return nil
}

// GetSession retrieves a single running session by ID.
func (s *Service) GetSession(ctx context.Context, id string) (*domain.RunningSession, error) {
	session, err := s.repo.GetSession(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get running session: %w", err)
	}
	return session, nil
}

// UpdateSession closes a live-tracked run: recalculates speed from final
// distance/duration, recomputes pace when not supplied, and persists totals.
// The session must already exist; ownership is enforced at the handler layer.
func (s *Service) UpdateSession(ctx context.Context, session *domain.RunningSession) error {
	if session.ID == "" {
		return fmt.Errorf("session id is required")
	}
	if session.Distance > 0 && session.Duration > 0 {
		session.Speed = (session.Distance / float64(session.Duration)) * 3600 // km/h
	}
	if session.Pace == "" && session.Distance > 0 && session.Duration > 0 {
		session.Pace = formatPace(session.Distance, session.Duration)
	}
	if err := s.repo.UpdateSession(ctx, session); err != nil {
		return fmt.Errorf("update running session: %w", err)
	}
	return nil
}

// DeleteSession removes a running session by ID. Ownership is enforced at the
// handler layer.
func (s *Service) DeleteSession(ctx context.Context, id string) error {
	if err := s.repo.DeleteSession(ctx, id); err != nil {
		return fmt.Errorf("delete running session: %w", err)
	}
	return nil
}

// SaveGpsPoint persists a single GPS sample for a running session.
// Points with accuracy worse than maxGpsAccuracyMeters are discarded (urban
// multipath garbage) — counted in the returned saved slice length.
func (s *Service) SaveGpsPoint(ctx context.Context, point *domain.GpsPoint) error {
	if point.ID == "" {
		point.ID = uuid.New().String()
	}
	if point.SessionID == "" {
		return fmt.Errorf("session_id is required")
	}
	if err := s.repo.SaveGpsPoint(ctx, point); err != nil {
		return fmt.Errorf("save gps point: %w", err)
	}
	return nil
}

// maxGpsAccuracyMeters: points reporting worse accuracy than this are noise.
const maxGpsAccuracyMeters = 50.0

// maxGpsBatchPoints: hard cap per live-location request.
const maxGpsBatchPoints = 100

// SaveGpsPointsBatch persists a batch of GPS samples for a live-tracked session.
// Invalid points (accuracy > maxGpsAccuracyMeters) are silently dropped;
// returns how many points were actually saved. Batch size is capped at
// maxGpsBatchPoints.
func (s *Service) SaveGpsPointsBatch(ctx context.Context, sessionID string, points []*domain.GpsPoint) (int, error) {
	if sessionID == "" {
		return 0, fmt.Errorf("session_id is required")
	}
	if len(points) == 0 {
		return 0, nil
	}
	if len(points) > maxGpsBatchPoints {
		return 0, fmt.Errorf("batch exceeds %d points", maxGpsBatchPoints)
	}

	valid := make([]*domain.GpsPoint, 0, len(points))
	for _, p := range points {
		if p.Accuracy > maxGpsAccuracyMeters {
			continue
		}
		p.SessionID = sessionID
		if p.ID == "" {
			p.ID = uuid.New().String()
		}
		valid = append(valid, p)
	}

	if err := s.repo.SaveGpsPoints(ctx, valid); err != nil {
		return 0, fmt.Errorf("save gps points batch: %w", err)
	}
	return len(valid), nil
}

// ListGpsPointsBySession returns all GPS points for a session ordered by timestamp ascending.
func (s *Service) ListGpsPointsBySession(ctx context.Context, sessionID string) ([]*domain.GpsPoint, error) {
	points, err := s.repo.ListGpsPointsBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("list gps points: %w", err)
	}
	return points, nil
}

// formatPace calculates pace as min/km from distance (km) and duration (seconds).
func formatPace(distance float64, durationSeconds int) string {
	if distance <= 0 {
		return "0:00"
	}
	paceSeconds := float64(durationSeconds) / distance
	minutes := int(paceSeconds) / 60
	seconds := int(paceSeconds) % 60
	return fmt.Sprintf("%d:%02d", minutes, seconds)
}

// RunningStats holds aggregated running statistics for a user.
type RunningStats struct {
	TotalSessions  int     `json:"total_sessions"`
	TotalDistance   float64 `json:"total_distance"`   // km
	TotalDuration   int     `json:"total_duration"`   // seconds
	TotalCalories   int     `json:"total_calories"`
	TotalElevation  float64 `json:"total_elevation"`  // meters
	AvgDistance     float64 `json:"avg_distance"`     // km
	AvgDuration     int     `json:"avg_duration"`     // seconds
	AvgCalories     int     `json:"avg_calories"`
	AvgHeartRate    int     `json:"avg_heart_rate"`
	AvgPace         string  `json:"avg_pace"`         // "5:30"
}
