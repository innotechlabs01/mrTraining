// Package importactivity imports running activity files (GPX/TCX/FIT) as
// RunningSession + GPS points.
package importactivity

import (
	"context"
	"fmt"
	"time"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/activityparse"
)

// Service converts parsed activity files into running domain records.
type Service struct {
	running *runningapp.Service
}

// NewService creates an import service with the running application service.
func NewService(running *runningapp.Service) *Service {
	return &Service{running: running}
}

// Import parses an activity file and persists it as a running session of the
// given user. Returns the session and how many GPS points were saved.
func (s *Service) Import(ctx context.Context, userID, format string, data []byte) (*domain.RunningSession, int, error) {
	if userID == "" {
		return nil, 0, fmt.Errorf("user ID is required")
	}
	if len(data) == 0 {
		return nil, 0, fmt.Errorf("file data is required")
	}

	act, err := activityparse.Parse(format, data)
	if err != nil {
		return nil, 0, err
	}

	date := time.Now().UTC().Format("2006-01-02")
	if act.StartTime != "" {
		if t, err := time.Parse(time.RFC3339, act.StartTime); err == nil {
			date = t.UTC().Format("2006-01-02")
		}
	}

	session := &domain.RunningSession{
		UserID:    userID,
		Date:      date,
		Distance:  round2(act.DistanceKm),
		Duration:  act.DurationSec,
		Pace:      paceFor(act.DistanceKm, act.DurationSec),
		Calories:  act.Calories,
		Elevation: round2(act.ElevationM),
		HeartRate: act.AvgHeartRate,
		Cadence:   act.Cadence,
		GPSRoute:  activityparse.EncodePolyline(act.Points),
		Source:    format,
	}
	if err := s.running.LogRunningSession(ctx, session); err != nil {
		return nil, 0, fmt.Errorf("save imported session: %w", err)
	}

	points := make([]*domain.GpsPoint, 0, len(act.Points))
	for _, p := range act.Points {
		points = append(points, &domain.GpsPoint{
			SessionID: session.ID,
			Lat:       p.Lat,
			Lng:       p.Lng,
			Alt:       p.Alt,
			Timestamp: p.Timestamp,
			Accuracy:  p.Accuracy,
		})
	}
	saved, err := s.running.SaveGpsPointsBatch(ctx, session.ID, points)
	if err != nil {
		return nil, 0, fmt.Errorf("save imported gps points: %w", err)
	}

	return session, saved, nil
}

func paceFor(distanceKm float64, durationSec int) string {
	if distanceKm <= 0 || durationSec <= 0 {
		return ""
	}
	paceSeconds := float64(durationSec) / distanceKm
	return fmt.Sprintf("%d:%02d", int(paceSeconds)/60, int(paceSeconds)%60)
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}
