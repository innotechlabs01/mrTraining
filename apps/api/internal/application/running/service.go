// Package running provides the application service layer for the running domain.
// It orchestrates business logic between HTTP handlers and the repository,
// keeping domain rules decoupled from transport concerns.
package running

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service implements running-related business operations.
// It depends on the running.Repository interface, making it testable with mocks.
type Service struct {
	repo      domain.Repository
	providers map[string]domain.WearableProvider
	db        *sql.DB
}

// NewService creates a new running application service with the given repository.
// Wearable providers can be registered via RegisterProvider.
func NewService(repo domain.Repository, db *sql.DB) *Service {
	return &Service{
		repo:      repo,
		providers: make(map[string]domain.WearableProvider),
		db:        db,
	}
}

// RegisterProvider adds a wearable provider to the service.
func (s *Service) RegisterProvider(provider domain.WearableProvider) {
	s.providers[provider.Name()] = provider
}

// SyncFromProvider pulls sessions from a registered wearable provider and
// persists them for the user. Returns how many sessions were imported.
// Used by the Garmin webhook and scheduled sync jobs.
func (s *Service) SyncFromProvider(ctx context.Context, providerName, userID string, from, to time.Time) (int, error) {
	provider, ok := s.providers[providerName]
	if !ok {
		return 0, fmt.Errorf("provider %s not registered", providerName)
	}
	if !provider.IsAvailable(ctx) {
		return 0, fmt.Errorf("provider %s not available", providerName)
	}

	sessions, err := provider.FetchSessions(ctx, userID, from, to)
	if err != nil {
		return 0, fmt.Errorf("sync from %s: %w", providerName, err)
	}

	imported := 0
	var batch []*ImportedSession
	flush := func() error {
		if len(batch) == 0 {
			return nil
		}
		res, err := s.ImportDeviceSessions(ctx, userID, batch)
		if err != nil {
			return err
		}
		imported += res.Imported
		batch = batch[:0]
		return nil
	}

	for i := range sessions {
		session := sessions[i]
		session.UserID = userID
		if session.Source == "" {
			session.Source = providerName
		}

		// A device workout id lets the import skip what was already stored, so
		// re-running a sync window never duplicates a run.
		if session.ExternalID != "" && domain.IsDeviceSource(session.Source) {
			batch = append(batch, &ImportedSession{ExternalID: session.ExternalID, Session: session})
			if len(batch) == maxImportedSessions {
				if err := flush(); err != nil {
					return imported, fmt.Errorf("import %s sessions: %w", providerName, err)
				}
			}
			continue
		}

		if err := s.LogRunningSession(ctx, &session); err != nil {
			return imported, fmt.Errorf("save %s session: %w", providerName, err)
		}
		imported++
	}

	if err := flush(); err != nil {
		return imported, fmt.Errorf("import %s sessions: %w", providerName, err)
	}
	return imported, nil
}

// maxImportedSessions caps one import request from a device sync.
const maxImportedSessions = 50

// maxImportedPoints caps the GPS route accepted for a single imported session.
const maxImportedPoints = 5000

// ImportedSession is a run recorded by a wearable, ready to persist.
// ExternalID is the device's own workout id and makes re-syncs idempotent.
type ImportedSession struct {
	ExternalID string
	Session    domain.RunningSession
	Points     []*domain.GpsPoint
}

// ImportResult reports what an import actually did.
type ImportResult struct {
	Imported int                      `json:"imported"`
	Skipped  int                      `json:"skipped"` // already known or unusable
	Sessions []*domain.RunningSession `json:"sessions"`
}

// ImportDeviceSessions persists runs recorded on a wearable (Apple Watch,
// Garmin, Health Connect). Re-importing the same workout is a no-op because
// (user_id, external_id) is unique, which lets clients sync a wide window
// without tracking what they already sent.
//
// Sessions that cannot be stored faithfully — no external id, no date, zero
// distance or duration, or an unknown source — are skipped instead of failing
// the whole batch, so one odd watch recording cannot block a sync.
func (s *Service) ImportDeviceSessions(ctx context.Context, userID string, imports []*ImportedSession) (*ImportResult, error) {
	if userID == "" {
		return nil, fmt.Errorf("user id is required")
	}
	if len(imports) > maxImportedSessions {
		return nil, fmt.Errorf("at most %d sessions per import", maxImportedSessions)
	}

	result := &ImportResult{Sessions: []*domain.RunningSession{}}

	for _, imp := range imports {
		if imp == nil {
			result.Skipped++
			continue
		}
		session := imp.Session
		if imp.ExternalID == "" || session.Date == "" || session.Distance <= 0 || session.Duration <= 0 {
			result.Skipped++
			continue
		}
		if !domain.IsDeviceSource(session.Source) {
			result.Skipped++
			continue
		}

		existing, found, err := s.repo.GetSessionIDByExternalID(ctx, userID, imp.ExternalID)
		if err != nil {
			return result, fmt.Errorf("check imported session: %w", err)
		}
		if found {
			_ = existing // already imported; nothing to write
			result.Skipped++
			continue
		}

		session.UserID = userID
		session.ExternalID = imp.ExternalID
		if session.ID == "" {
			session.ID = uuid.New().String()
		}
		if session.Distance > 0 && session.Duration > 0 {
			session.Speed = (session.Distance / float64(session.Duration)) * 3600 // km/h
		}
		if session.Pace == "" && session.Distance > 0 && session.Duration > 0 {
			session.Pace = formatPace(session.Distance, session.Duration)
		}

		if err := s.repo.SaveSession(ctx, &session); err != nil {
			return result, fmt.Errorf("import session: %w", err)
		}
		if err := s.repo.SaveSessionDevice(ctx, &session); err != nil {
			return result, fmt.Errorf("import session device: %w", err)
		}

		if points := imp.Points; len(points) > 0 {
			if len(points) > maxImportedPoints {
				points = points[:maxImportedPoints]
			}
			valid := make([]*domain.GpsPoint, 0, len(points))
			for _, p := range points {
				if p == nil || p.Accuracy > maxGpsAccuracyMeters {
					continue
				}
				p.SessionID = session.ID
				if p.ID == "" {
					p.ID = uuid.New().String()
				}
				valid = append(valid, p)
			}
			// Device routes can be long; SaveGpsPoints already runs in one tx.
			if err := s.repo.SaveGpsPoints(ctx, valid); err != nil {
				return result, fmt.Errorf("import session points: %w", err)
			}
		}

		result.Imported++
		result.Sessions = append(result.Sessions, &session)
	}

	return result, nil
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

// GetRunningHistoryByAthlete returns paginated running sessions of an athlete.
func (s *Service) GetRunningHistoryByAthlete(ctx context.Context, athleteID string, fromDate, toDate string, page, limit int) ([]*domain.RunningSession, int, error) {
	offset := (page - 1) * limit

	sessions, err := s.repo.ListSessionsByUser(ctx, athleteID, fromDate, toDate, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("get running history by athlete: %w", err)
	}

	total, err := s.repo.CountSessionsByUser(ctx, athleteID, fromDate, toDate)
	if err != nil {
		return nil, 0, fmt.Errorf("count running sessions by athlete: %w", err)
	}

	return sessions, total, nil
}

// GetRunningStatsByAthlete returns aggregated running statistics of an athlete.
func (s *Service) GetRunningStatsByAthlete(ctx context.Context, athleteID string, fromDate, toDate string) (*RunningStats, error) {
	sessions, err := s.repo.ListSessionsByUser(ctx, athleteID, fromDate, toDate, 10000, 0)
	if err != nil {
		return nil, fmt.Errorf("get running stats by athlete: %w", err)
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

	for _, sess := range sessions {
		totalDistance += sess.Distance
		totalDuration += sess.Duration
		totalCalories += sess.Calories
		totalElevation += sess.Elevation
		if sess.HeartRate > 0 {
			totalHeartRate += sess.HeartRate
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

// WeeklyTrendPoint represents a single week of running data for charts.
type WeeklyTrendPoint struct {
	Week         string  `json:"week"`
	Distance     float64 `json:"distance"` // km
	Sessions     int     `json:"sessions"`
	AvgPaceSec   float64 `json:"avg_pace_sec"`   // seconds per km
	AvgHeartRate int     `json:"avg_heart_rate"` // bpm
}

// GetRunningWeeklyTrendByAthlete returns weekly aggregated running data for an athlete.
func (s *Service) GetRunningWeeklyTrendByAthlete(ctx context.Context, athleteID string, fromDate, toDate string) ([]WeeklyTrendPoint, error) {
	sessions, err := s.repo.ListSessionsByUser(ctx, athleteID, fromDate, toDate, 10000, 0)
	if err != nil {
		return nil, fmt.Errorf("get running weekly trend: %w", err)
	}

	if len(sessions) == 0 {
		return []WeeklyTrendPoint{}, nil
	}

	// Group by ISO week
	weekMap := make(map[string]*WeeklyTrendPoint)
	for _, sess := range sessions {
		week := getISOWeek(sess.Date)
		if weekMap[week] == nil {
			weekMap[week] = &WeeklyTrendPoint{Week: week}
		}
		w := weekMap[week]
		w.Distance += sess.Distance
		w.Sessions++
		if sess.HeartRate > 0 {
			w.AvgHeartRate += sess.HeartRate
		}
		if sess.Distance > 0 && sess.Duration > 0 {
			paceSec := float64(sess.Duration) / sess.Distance
			if w.AvgPaceSec == 0 {
				w.AvgPaceSec = paceSec
			} else {
				w.AvgPaceSec = (w.AvgPaceSec + paceSec) / 2 // simple running average
			}
		}
	}

	// Finalize averages
	var result []WeeklyTrendPoint
	for _, w := range weekMap {
		if w.Sessions > 0 && w.AvgHeartRate > 0 {
			w.AvgHeartRate = w.AvgHeartRate / w.Sessions
		}
		result = append(result, *w)
	}

	// Sort by week
	sort.Slice(result, func(i, j int) bool { return result[i].Week < result[j].Week })

	return result, nil
}

// ExportRunningSessions exports running sessions as CSV or GPX.
func (s *Service) ExportRunningSessions(ctx context.Context, athleteID string, format, fromDate, toDate string) ([]byte, string, string, error) {
	sessions, err := s.repo.ListSessionsByUser(ctx, athleteID, fromDate, toDate, 10000, 0)
	if err != nil {
		return nil, "", "", fmt.Errorf("export running sessions: %w", err)
	}

	if format == "csv" {
		return s.exportCSV(sessions, athleteID)
	}
	return s.exportGPX(sessions, athleteID)
}

func (s *Service) exportCSV(sessions []*domain.RunningSession, athleteID string) ([]byte, string, string, error) {
	var buf strings.Builder
	buf.WriteString("date,distance_km,duration_sec,pace,heart_rate,cadence,calories,elevation_m,gps_route,source\n")
	for _, s := range sessions {
		buf.WriteString(fmt.Sprintf("%s,%.2f,%d,%s,%d,%d,%d,%.1f,%s,%s\n",
			s.Date, s.Distance, s.Duration, s.Pace, s.HeartRate, s.Cadence, s.Calories, s.Elevation, s.GPSRoute, s.Source))
	}
	filename := fmt.Sprintf("running-%s-%s.csv", athleteID, time.Now().Format("20060102"))
	return []byte(buf.String()), filename, "text/csv", nil
}

func (s *Service) exportGPX(sessions []*domain.RunningSession, athleteID string) ([]byte, string, string, error) {
	var buf strings.Builder
	buf.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	buf.WriteString(`<gpx version="1.1" creator="MR Training" xmlns="http://www.topografix.com/GPX/1/1">` + "\n")
	for _, s := range sessions {
		if s.GPSRoute == "" {
			continue
		}
		buf.WriteString("  <trk>\n")
		buf.WriteString(fmt.Sprintf("    <name>%s - %.2f km</name>\n", s.Date, s.Distance))
		buf.WriteString("    <trkseg>\n")
		// Note: polyline decoding would be needed here for full GPX with trackpoints
		buf.WriteString("    </trkseg>\n")
		buf.WriteString("  </trk>\n")
	}
	buf.WriteString("</gpx>\n")
	filename := fmt.Sprintf("running-%s-%s.gpx", athleteID, time.Now().Format("20060102"))
	return []byte(buf.String()), filename, "application/gpx+xml", nil
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
	TotalDistance  float64 `json:"total_distance"` // km
	TotalDuration  int     `json:"total_duration"` // seconds
	TotalCalories  int     `json:"total_calories"`
	TotalElevation float64 `json:"total_elevation"` // meters
	AvgDistance    float64 `json:"avg_distance"`    // km
	AvgDuration    int     `json:"avg_duration"`    // seconds
	AvgCalories    int     `json:"avg_calories"`
	AvgHeartRate   int     `json:"avg_heart_rate"`
	AvgPace        string  `json:"avg_pace"` // "5:30"
}

// getISOWeek returns ISO week string (YYYY-Www) from date string (YYYY-MM-DD).
func getISOWeek(dateStr string) string {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return ""
	}
	year, week := t.ISOWeek()
	return fmt.Sprintf("%d-W%02d", year, week)
}

// --- Structured running workout template operations ---

// CreateTemplate creates a new running workout template with its segments.
func (s *Service) CreateTemplate(ctx context.Context, t *domain.RunningWorkoutTemplate) error {
	if t.CoachID == "" {
		return fmt.Errorf("coach id is required")
	}
	if t.Name == "" {
		return fmt.Errorf("name is required")
	}
	if t.Type == "" {
		t.Type = domain.TemplateTypeFreeRun
	}

	var tx *sql.Tx
	if s.db != nil {
		var errTx error
		tx, errTx = s.db.BeginTx(ctx, nil)
		if errTx != nil {
			return fmt.Errorf("begin tx: %w", errTx)
		}
		var err error
		defer func() {
			if err != nil {
				tx.Rollback()
			}
		}()
		if err = s.repo.SaveTemplate(ctx, t); err != nil {
			return fmt.Errorf("create template: %w", err)
		}
		if err = s.insertOutboxTemplateCreatedTx(ctx, tx, t.ID, t.CoachID, t.Name); err != nil {
			return fmt.Errorf("insert outbox template.created: %w", err)
		}
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("commit template: %w", err)
		}
		return nil
	}

	if err := s.repo.SaveTemplate(ctx, t); err != nil {
		return fmt.Errorf("create template: %w", err)
	}
	if err := s.insertOutboxTemplateCreated(ctx, t.ID, t.CoachID, t.Name); err != nil {
		return fmt.Errorf("insert outbox template.created: %w", err)
	}
	return nil
}

// GetTemplate retrieves a template by ID with its segments.
func (s *Service) GetTemplate(ctx context.Context, id string) (*domain.RunningWorkoutTemplate, error) {
	t, err := s.repo.GetTemplate(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get template: %w", err)
	}
	return t, nil
}

// ListTemplatesByCoach retrieves all non-deleted templates for a coach.
func (s *Service) ListTemplatesByCoach(ctx context.Context, coachID string) ([]*domain.RunningWorkoutTemplate, error) {
	templates, err := s.repo.ListTemplatesByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}
	return templates, nil
}

// UpdateTemplate updates template mutable fields and persistence.
func (s *Service) UpdateTemplate(ctx context.Context, id, name, description string, ttype domain.RunningWorkoutTemplateType, targetPaceMin, targetPaceMax *float64, targetHRMin, targetHRMax, targetCadence *int, targetDistance *float64, targetDuration *int) error {
	t, err := s.repo.GetTemplate(ctx, id)
	if err != nil {
		return fmt.Errorf("get template: %w", err)
	}
	if name != "" {
		t.Name = name
	}
	if description != "" {
		t.Description = description
	}
	if ttype != "" {
		t.Type = ttype
	}
	if targetPaceMin != nil {
		t.TargetPaceMinPerKm = targetPaceMin
	}
	if targetPaceMax != nil {
		t.TargetPaceMaxPerKm = targetPaceMax
	}
	if targetHRMin != nil {
		t.TargetHeartRateMin = targetHRMin
	}
	if targetHRMax != nil {
		t.TargetHeartRateMax = targetHRMax
	}
	if targetCadence != nil {
		t.TargetCadence = targetCadence
	}
	if targetDistance != nil {
		t.TargetDistanceKm = targetDistance
	}
	if targetDuration != nil {
		t.TargetDurationSec = targetDuration
	}

	var tx *sql.Tx
	if s.db != nil {
		var errTx error
		tx, errTx = s.db.BeginTx(ctx, nil)
		if errTx != nil {
			return fmt.Errorf("begin tx: %w", errTx)
		}
		defer func() {
			if err != nil {
				tx.Rollback()
			}
		}()
	}

	if err = s.repo.SaveTemplate(ctx, t); err != nil {
		return fmt.Errorf("update template: %w", err)
	}

	if tx != nil {
		if err = s.insertOutboxTemplateUpdatedTx(ctx, tx, t.ID, t.CoachID, t.Name, t.Version); err != nil {
			return fmt.Errorf("insert outbox template.updated: %w", err)
		}
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("commit template update: %w", err)
		}
		return nil
	}

	if err = s.insertOutboxTemplateUpdated(ctx, t.ID, t.CoachID, t.Name, t.Version); err != nil {
		return fmt.Errorf("insert outbox template.updated: %w", err)
	}
	return nil
}

func (s *Service) DeleteTemplate(ctx context.Context, id string) error {
	if err := s.repo.DeleteTemplate(ctx, id); err != nil {
		return fmt.Errorf("delete template: %w", err)
	}
	return nil
}

// --- Assignment operations ---

// CreateAssignment assigns a running workout template to an athlete.
func (s *Service) CreateAssignment(ctx context.Context, a *domain.RunningWorkoutAssignment) error {
	if a.CoachID == "" {
		return fmt.Errorf("coach id is required")
	}
	if a.AthleteID == "" {
		return fmt.Errorf("athlete id is required")
	}
	if a.TemplateID == "" {
		return fmt.Errorf("template id is required")
	}
	if a.Status == "" {
		a.Status = domain.AssignmentStatusAssigned
	}
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	// Validate template exists and belongs to the coach.
	template, err := s.repo.GetTemplate(ctx, a.TemplateID)
	if err != nil {
		return fmt.Errorf("get template: %w", err)
	}
	if template == nil {
		return fmt.Errorf("template not found: %s", a.TemplateID)
	}
	if template.CoachID != a.CoachID {
		return fmt.Errorf("coach %s does not own template %s", a.CoachID, a.TemplateID)
	}
	// Prevent duplicate active assignment for same athlete+template.
	for _, status := range []domain.RunningWorkoutAssignmentStatus{domain.AssignmentStatusAssigned, domain.AssignmentStatusStarted} {
		existing, err := s.repo.ListAssignmentsByAthlete(ctx, a.AthleteID, status)
		if err == nil {
			for _, aa := range existing {
				if aa.TemplateID == a.TemplateID {
					return fmt.Errorf("duplicate active assignment for athlete %s and template %s", a.AthleteID, a.TemplateID)
				}
			}
		}
	}

	var tx *sql.Tx
	if s.db != nil {
		var errTx error
		tx, errTx = s.db.BeginTx(ctx, nil)
		if errTx != nil {
			return fmt.Errorf("begin tx: %w", errTx)
		}
		var err error
		defer func() {
			if err != nil {
				tx.Rollback()
			}
		}()
		if err = s.repo.SaveAssignment(ctx, a); err != nil {
			return fmt.Errorf("create assignment: %w", err)
		}
		if err = s.insertOutboxAssignmentCreatedTx(ctx, tx, a.ID, a.CoachID, a.AthleteID, a.TemplateID); err != nil {
			return fmt.Errorf("create assignment and insert outbox: %w", err)
		}
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("commit assignment: %w", err)
		}
		return nil
	}

	if err := s.repo.SaveAssignment(ctx, a); err != nil {
		return fmt.Errorf("create assignment: %w", err)
	}
	if err := s.insertOutboxAssignmentCreated(ctx, a.ID, a.CoachID, a.AthleteID, a.TemplateID); err != nil {
		return fmt.Errorf("create assignment and insert outbox: %w", err)
	}
	return nil
}

// GetAssignment retrieves an assignment by ID.
// AssignTemplate is an alias used by tests/older callers.
func (s *Service) AssignTemplate(ctx context.Context, a *domain.RunningWorkoutAssignment) error {
	return s.CreateAssignment(ctx, a)
}

// GetAssignment retrieves an assignment by ID. Optional principal info can be
// provided to enforce ownership (coach/athlete).
func (s *Service) GetAssignment(ctx context.Context, id string, principal ...string) (*domain.RunningWorkoutAssignment, error) {
	a, err := s.repo.GetAssignment(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get assignment: %w", err)
	}
	if len(principal) >= 2 {
		userID, role := principal[0], principal[1]
		switch role {
		case "coach":
			if a.CoachID != userID {
				return nil, apperrors.Forbidden("not allowed to read this assignment")
			}
		case "athlete":
			if a.AthleteID != userID {
				return nil, apperrors.Forbidden("not allowed to read this assignment")
			}
		default:
			return nil, apperrors.Forbidden("not allowed to read this assignment")
		}
	}
	return a, nil
}

// ListAssignmentsByAthlete retrieves assignments for an athlete.
func (s *Service) ListAssignmentsByAthlete(ctx context.Context, athleteID string, status domain.RunningWorkoutAssignmentStatus) ([]*domain.RunningWorkoutAssignment, error) {
	assignments, err := s.repo.ListAssignmentsByAthlete(ctx, athleteID, status)
	if err != nil {
		return nil, fmt.Errorf("list assignments by athlete: %w", err)
	}
	return assignments, nil
}

// ListAssignmentsByCoach retrieves assignments created by a coach.
func (s *Service) ListAssignmentsByCoach(ctx context.Context, coachID string) ([]*domain.RunningWorkoutAssignment, error) {
	assignments, err := s.repo.ListAssignmentsByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list assignments by coach: %w", err)
	}
	return assignments, nil
}

// UpdateAssignmentStatus changes the status of an assignment.
func (s *Service) UpdateAssignmentStatus(ctx context.Context, id string, status domain.RunningWorkoutAssignmentStatus) error {
	if err := s.repo.UpdateAssignmentStatus(ctx, id, status); err != nil {
		return fmt.Errorf("update assignment status: %w", err)
	}
	return nil
}

// --- Session start / snapshot ---

// StartSession creates a running session linked to an assignment and captures
// an immutable snapshot of the prescription.
func (s *Service) StartSession(ctx context.Context, assignmentID, athleteID string) (*domain.RunningSession, error) {
	assignment, err := s.repo.GetAssignment(ctx, assignmentID)
	if err != nil {
		return nil, fmt.Errorf("get assignment: %w", err)
	}
	if assignment.AthleteID != athleteID {
		return nil, fmt.Errorf("assignment does not belong to athlete %s", athleteID)
	}
	if assignment.Status == domain.AssignmentStatusCompleted {
		return nil, fmt.Errorf("assignment already completed")
	}

	template, err := s.repo.GetTemplate(ctx, assignment.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("get template: %w", err)
	}
	segments, err := s.repo.ListSegmentsByTemplate(ctx, assignment.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("get segments: %w", err)
	}
	template.Segments = segments

	session := &domain.RunningSession{
		ID:        uuid.New().String(),
		UserID:    athleteID,
		Date:      time.Now().UTC().Format(time.RFC3339),
		Source:    domain.SourceMobileGPS,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	var tx *sql.Tx
	if s.db != nil {
		tx, err = s.db.BeginTx(ctx, nil)
		if err != nil {
			return nil, fmt.Errorf("begin tx: %w", err)
		}
		defer func() {
			if err != nil {
				tx.Rollback()
			}
		}()
		if err = s.repo.SaveSession(ctx, session); err != nil {
			return nil, fmt.Errorf("save running session: %w", err)
		}

		snapshot := &domain.RunningWorkoutSnapshot{
			ID:           uuid.New().String(),
			AssignmentID: assignment.ID,
			SessionID:    session.ID,
			CapturedAt:   time.Now().UTC(),
		}
		var templateCopy []byte
		templateCopy, err = json.Marshal(template)
		if err != nil {
			return nil, fmt.Errorf("marshal template copy: %w", err)
		}
		snapshot.TemplateCopy = string(templateCopy)
		if err = s.repo.SaveSnapshot(ctx, snapshot); err != nil {
			return nil, fmt.Errorf("save snapshot: %w", err)
		}

		if err = s.repo.UpdateAssignmentStatus(ctx, assignmentID, domain.AssignmentStatusStarted); err != nil {
			return nil, fmt.Errorf("update assignment status: %w", err)
		}

		coachID := assignment.CoachID
		if coachID == "" && template != nil {
			coachID = template.CoachID
		}

		if err = s.insertOutboxWorkoutStartedTx(ctx, tx, session.ID, athleteID, assignment.TemplateID, coachID); err != nil {
			return nil, fmt.Errorf("insert outbox workout.started: %w", err)
		}
		if err = tx.Commit(); err != nil {
			return nil, fmt.Errorf("commit start session: %w", err)
		}
		return session, nil
	}

	if err := s.repo.SaveSession(ctx, session); err != nil {
		return nil, fmt.Errorf("save running session: %w", err)
	}

	snapshot := &domain.RunningWorkoutSnapshot{
		ID:           uuid.New().String(),
		AssignmentID: assignment.ID,
		SessionID:    session.ID,
		CapturedAt:   time.Now().UTC(),
	}
	templateCopy, err := json.Marshal(template)
	if err != nil {
		return nil, fmt.Errorf("marshal template copy: %w", err)
	}
	snapshot.TemplateCopy = string(templateCopy)
	if err := s.repo.SaveSnapshot(ctx, snapshot); err != nil {
		return nil, fmt.Errorf("save snapshot: %w", err)
	}

	if err := s.repo.UpdateAssignmentStatus(ctx, assignmentID, domain.AssignmentStatusStarted); err != nil {
		return nil, fmt.Errorf("update assignment status: %w", err)
	}

	coachID := assignment.CoachID
	if coachID == "" && template != nil {
		coachID = template.CoachID
	}

	if err := s.insertOutboxWorkoutStarted(ctx, session.ID, athleteID, assignment.TemplateID, coachID); err != nil {
		return nil, fmt.Errorf("insert outbox workout.started: %w", err)
	}
	return session, nil
}

// CompleteSession finalizes a running session with real metrics.
func (s *Service) CompleteSession(ctx context.Context, sessionID, athleteID string, session *domain.RunningSession) error {
	existing, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("get running session: %w", err)
	}
	if existing.UserID != athleteID {
		return apperrors.Forbidden("not allowed to complete this session")
	}
	if session == nil || session.Duration < 0 || session.Distance < 0 || math.IsNaN(session.Distance) || math.IsInf(session.Distance, 0) {
		return apperrors.BadRequest("distance and duration must be nonnegative finite values")
	}
	snapshot, err := s.repo.GetSnapshotBySession(ctx, sessionID)
	var appErr *apperrors.AppError
	if err != nil && !(errors.As(err, &appErr) && appErr.Code == "NOT_FOUND") {
		return fmt.Errorf("get running snapshot: %w", err)
	}
	// Guard against duplicate completion for linked assignments.
	if snapshot != nil {
		if assignment, err := s.repo.GetAssignment(ctx, snapshot.AssignmentID); err == nil && assignment != nil && assignment.Status == domain.AssignmentStatusCompleted {
			return fmt.Errorf("session already completed")
		}
	}
	// Keep server identity, date, source and device metadata, never payload values.
	updated := *existing
	updated.Distance, updated.Duration, updated.Pace = session.Distance, session.Duration, session.Pace
	updated.Calories, updated.Elevation = session.Calories, session.Elevation
	updated.HeartRate, updated.Cadence, updated.GPSRoute = session.HeartRate, session.Cadence, session.GPSRoute
	if err := s.repo.UpdateSession(ctx, &updated); err != nil {
		return fmt.Errorf("complete session: %w", err)
	}
	var coachID string
	if snapshot != nil {
		if assignment, aerr := s.repo.GetAssignment(ctx, snapshot.AssignmentID); aerr == nil && assignment != nil {
			coachID = assignment.CoachID
		}
	}

	var tx *sql.Tx
	if s.db != nil {
		tx, err = s.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin tx: %w", err)
		}
		defer func() {
			if err != nil {
				tx.Rollback()
			}
		}()
		if err = s.insertOutboxWorkoutCompletedTx(ctx, tx, sessionID, athleteID, coachID); err != nil {
			return fmt.Errorf("insert outbox workout.completed: %w", err)
		}
		if snapshot != nil {
			if err = s.repo.UpdateAssignmentStatus(ctx, snapshot.AssignmentID, domain.AssignmentStatusCompleted); err != nil {
				return fmt.Errorf("complete assignment: %w", err)
			}
		}
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("commit complete session: %w", err)
		}
		return nil
	}

	if err := s.insertOutboxWorkoutCompleted(ctx, sessionID, athleteID, coachID); err != nil {
		return fmt.Errorf("insert outbox workout.completed: %w", err)
	}
	if snapshot != nil {
		if err := s.repo.UpdateAssignmentStatus(ctx, snapshot.AssignmentID, domain.AssignmentStatusCompleted); err != nil {
			return fmt.Errorf("complete assignment: %w", err)
		}
	}
	return nil
}

// insertOutboxTemplateCreated inserts a template.created event into the Outbox table.
// FinishSession finalizes a session without full metrics payload.
func (s *Service) FinishSession(ctx context.Context, sessionID, athleteID string) error {
	return s.CompleteSession(ctx, sessionID, athleteID, &domain.RunningSession{})
}

// GetSnapshotBySession delegates to repository.
func (s *Service) GetSnapshotBySession(ctx context.Context, sessionID string) (*domain.RunningWorkoutSnapshot, error) {
	return s.repo.GetSnapshotBySession(ctx, sessionID)
}

func (s *Service) insertOutboxTemplateCreated(ctx context.Context, templateID, coachID, name string) error {
	if s.db == nil {
		return nil
	}
	if name == "" {
		name = templateID
	}
	payload := map[string]interface{}{
		"name":     name,
		"coach_id": coachID,
		"version":  1,
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'template.created', 'template', $1, $2, NULL, $3, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, templateID, coachID, payload)
	return err
}

func (s *Service) insertOutboxTemplateCreatedTx(ctx context.Context, tx *sql.Tx, templateID, coachID, name string) error {
	if name == "" {
		name = templateID
	}
	payload := map[string]interface{}{
		"name":     name,
		"coach_id": coachID,
		"version":  1,
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'template.created', 'template', $1, $2, NULL, $3, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, templateID, coachID, payload)
	return err
}

func (s *Service) insertOutboxTemplateUpdatedTx(ctx context.Context, tx *sql.Tx, templateID, coachID, name string, version int) error {
	if name == "" {
		name = templateID
	}
	payload := map[string]interface{}{
		"name":     name,
		"coach_id": coachID,
		"version":  version,
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'template.updated', 'template', $1, $2, NULL, $3, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, templateID, coachID, payload)
	return err
}

func (s *Service) insertOutboxTemplateUpdated(ctx context.Context, templateID, coachID, name string, version int) error {
	if s.db == nil {
		return nil
	}
	if name == "" {
		name = templateID
	}
	payload := map[string]interface{}{
		"name":     name,
		"coach_id": coachID,
		"version":  version,
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'template.updated', 'template', $1, $2, NULL, $3, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, templateID, coachID, payload)
	return err
}

// insertOutboxAssignmentCreated inserts an assignment.created event into the Outbox table.
func (s *Service) insertOutboxAssignmentCreated(ctx context.Context, assignmentID, coachID, athleteID, templateID string) error {
	if s.db == nil {
		return nil
	}
	payload := map[string]interface{}{
		"coach_id":    coachID,
		"athlete_id":  athleteID,
		"template_id": templateID,
		"status":      "assigned",
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'assignment.created', 'assignment', $1, $2, $3, $4, NOW(), 'pending', 0, COALESCE((SELECT NOW()), NOW()), NULL, NOW())
	`, assignmentID, coachID, athleteID, payload)
	return err
}

func (s *Service) insertOutboxAssignmentCreatedTx(ctx context.Context, tx *sql.Tx, assignmentID, coachID, athleteID, templateID string) error {
	payload := map[string]interface{}{
		"coach_id":    coachID,
		"athlete_id":  athleteID,
		"template_id": templateID,
		"status":      "assigned",
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'assignment.created', 'assignment', $1, $2, $3, $4, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, assignmentID, coachID, athleteID, payload)
	return err
}

// insertOutboxWorkoutStarted inserts a workout.started event into the Outbox table.
func (s *Service) insertOutboxWorkoutStarted(ctx context.Context, sessionID, athleteID, templateID, coachID string) error {
	if s.db == nil {
		return nil
	}
	payload := map[string]interface{}{
		"athlete_id":  athleteID,
		"template_id": templateID,
		"session_id":  sessionID,
		"coach_id":    coachID,
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'workout.started', 'workout', $1, $2, $3, $4, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, sessionID, coachID, athleteID, payload)
	return err
}

func (s *Service) insertOutboxWorkoutStartedTx(ctx context.Context, tx *sql.Tx, sessionID, athleteID, templateID, coachID string) error {
	payload := map[string]interface{}{
		"athlete_id":  athleteID,
		"template_id": templateID,
		"session_id":  sessionID,
		"coach_id":    coachID,
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'workout.started', 'workout', $1, $2, $3, $4, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, sessionID, coachID, athleteID, payload)
	return err
}

// insertOutboxWorkoutCompleted inserts a workout.completed event into the Outbox table.
func (s *Service) insertOutboxWorkoutCompleted(ctx context.Context, sessionID, athleteID, coachID string) error {
	if s.db == nil {
		return nil
	}
	payload := map[string]interface{}{
		"athlete_id": athleteID,
		"session_id": sessionID,
		"coach_id":   coachID,
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'workout.completed', 'workout', $1, $2, $3, $4, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, sessionID, coachID, athleteID, payload)
	return err
}

func (s *Service) insertOutboxWorkoutCompletedTx(ctx context.Context, tx *sql.Tx, sessionID, athleteID, coachID string) error {
	payload := map[string]interface{}{
		"athlete_id": athleteID,
		"session_id": sessionID,
		"coach_id":   coachID,
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO outbox (event_id, event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, occurred_at, status, attempts, next_retry_at, last_error, created_at)
		VALUES (gen_random_uuid(), 'workout.completed', 'workout', $1, $2, $3, $4, NOW(), 'pending', 0, NOW(), NULL, NOW())
	`, sessionID, coachID, athleteID, payload)
	return err
}
