package health

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/domain/health"
)

// Repository implements health.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new health repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetMetrics returns recent health metrics for an athlete.
func (r *Repository) GetMetrics(ctx context.Context, athleteID string, days int) ([]*health.HealthMetric, error) {
	query := `SELECT id, athlete_id, metric_type, value, unit, source, source_workout_id, recorded_at, synced_at
	          FROM athlete_health_metrics WHERE athlete_id = ?`
	args := []interface{}{athleteID}
	if days > 0 {
		query += ` AND recorded_at >= datetime('now', ?)`
		args = append(args, fmt.Sprintf("-%d days", days))
	}
	query += ` ORDER BY recorded_at DESC`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get health metrics: %w", err)
	}
	defer rows.Close()
	var out []*health.HealthMetric
	for rows.Next() {
		m := &health.HealthMetric{}
		var sourceWorkoutID sql.NullString
		if err := rows.Scan(&m.ID, &m.AthleteID, &m.MetricType, &m.Value, &m.Unit, &m.Source, &sourceWorkoutID, &m.RecordedAt, &m.SyncedAt); err != nil {
			return nil, fmt.Errorf("failed to scan health metric: %w", err)
		}
		if sourceWorkoutID.Valid {
			s := sourceWorkoutID.String
			m.SourceWorkoutID = &s
		}
		out = append(out, m)
	}
	return out, nil
}

// RecordMetric inserts a health metric.
func (r *Repository) RecordMetric(ctx context.Context, m *health.HealthMetric) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO athlete_health_metrics (id, athlete_id, metric_type, value, unit, source, source_workout_id, recorded_at, synced_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		m.ID, m.AthleteID, m.MetricType, m.Value, m.Unit, m.Source, m.SourceWorkoutID, m.RecordedAt)
	if err != nil {
		return fmt.Errorf("failed to record health metric: %w", err)
	}
	return nil
}

// GetSleepLogs returns recent sleep logs for an athlete.
func (r *Repository) GetSleepLogs(ctx context.Context, athleteID string, days int) ([]*health.SleepLog, error) {
	query := `SELECT id, athlete_id, date, total_minutes, deep_minutes, rem_minutes, light_minutes, awake_minutes, efficiency, score, source
	          FROM athlete_sleep_logs WHERE athlete_id = ?`
	args := []interface{}{athleteID}
	if days > 0 {
		query += ` AND date >= date('now', ?)`
		args = append(args, fmt.Sprintf("-%d days", days))
	}
	query += ` ORDER BY date DESC`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get sleep logs: %w", err)
	}
	defer rows.Close()
	var out []*health.SleepLog
	for rows.Next() {
		s := &health.SleepLog{}
		var deep, rem, light, awake sql.NullInt32
		var efficiency sql.NullFloat64
		var score sql.NullInt32
		if err := rows.Scan(&s.ID, &s.AthleteID, &s.Date, &s.TotalMinutes, &deep, &rem, &light, &awake, &efficiency, &score, &s.Source); err != nil {
			return nil, fmt.Errorf("failed to scan sleep log: %w", err)
		}
		if deep.Valid {
			v := int(deep.Int32)
			s.DeepMinutes = &v
		}
		if rem.Valid {
			v := int(rem.Int32)
			s.RemMinutes = &v
		}
		if light.Valid {
			v := int(light.Int32)
			s.LightMinutes = &v
		}
		if awake.Valid {
			v := int(awake.Int32)
			s.AwakeMinutes = &v
		}
		if efficiency.Valid {
			s.Efficiency = &efficiency.Float64
		}
		if score.Valid {
			v := int(score.Int32)
			s.Score = &v
		}
		out = append(out, s)
	}
	return out, nil
}

// RecordSleepLog inserts a sleep log.
func (r *Repository) RecordSleepLog(ctx context.Context, s *health.SleepLog) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO athlete_sleep_logs (id, athlete_id, date, total_minutes, deep_minutes, rem_minutes, light_minutes, awake_minutes, efficiency, score, source)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		s.ID, s.AthleteID, s.Date, s.TotalMinutes, s.DeepMinutes, s.RemMinutes, s.LightMinutes, s.AwakeMinutes, s.Efficiency, s.Score, s.Source)
	if err != nil {
		return fmt.Errorf("failed to record sleep log: %w", err)
	}
	return nil
}

// GetDevices returns registered devices for an athlete.
func (r *Repository) GetDevices(ctx context.Context, athleteID string) ([]*health.HealthDevice, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, athlete_id, platform, device_name, device_brand, is_active, last_sync_at, created_at
		 FROM athlete_health_devices WHERE athlete_id = ? ORDER BY created_at DESC`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get health devices: %w", err)
	}
	defer rows.Close()
	var out []*health.HealthDevice
	for rows.Next() {
		d := &health.HealthDevice{}
		var lastSync sql.NullString
		if err := rows.Scan(&d.ID, &d.AthleteID, &d.Platform, &d.DeviceName, &d.DeviceBrand, &d.IsActive, &lastSync, &d.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan health device: %w", err)
		}
		if lastSync.Valid {
			s := lastSync.String
			d.LastSyncAt = &s
		}
		out = append(out, d)
	}
	return out, nil
}

// RegisterDevice inserts or updates a device.
func (r *Repository) RegisterDevice(ctx context.Context, d *health.HealthDevice) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO athlete_health_devices (id, athlete_id, platform, device_name, device_brand, is_active, last_sync_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
		 ON CONFLICT(athlete_id, platform) DO UPDATE SET device_name=excluded.device_name, device_brand=excluded.device_brand, is_active=1, last_sync_at=datetime('now')`,
		d.ID, d.AthleteID, d.Platform, d.DeviceName, d.DeviceBrand, d.IsActive, d.LastSyncAt)
	if err != nil {
		return fmt.Errorf("failed to register health device: %w", err)
	}
	return nil
}

// RemoveDevice deletes a device.
func (r *Repository) RemoveDevice(ctx context.Context, deviceID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM athlete_health_devices WHERE id = ?`, deviceID)
	if err != nil {
		return fmt.Errorf("failed to remove health device: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("health device not found")
	}
	return nil
}
