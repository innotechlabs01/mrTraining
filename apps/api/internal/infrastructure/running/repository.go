package running

import (
	"context"
	"database/sql"
	"fmt"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements running.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new running repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// --- Session operations ---

// SaveSession persists a running session record.
func (r *Repository) SaveSession(ctx context.Context, s *domain.RunningSession) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO running_sessions (id, user_id, date, distance, duration, pace, speed, calories, elevation, heart_rate, cadence, gps_route, source, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		s.ID, s.UserID, s.Date, s.Distance, s.Duration, s.Pace, s.Speed,
		s.Calories, s.Elevation, s.HeartRate, s.Cadence, nullStr(s.GPSRoute), s.Source)
	if err != nil {
		return fmt.Errorf("failed to save running session: %w", err)
	}
	return nil
}

// GetSession retrieves a session by its unique identifier.
func (r *Repository) GetSession(ctx context.Context, id string) (*domain.RunningSession, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, date, distance, duration, pace, speed, calories, elevation, heart_rate, cadence, gps_route, source, created_at
		 FROM running_sessions WHERE id = ?`, id)

	s := &domain.RunningSession{}
	var gpsRoute sql.NullString
	err := row.Scan(&s.ID, &s.UserID, &s.Date, &s.Distance, &s.Duration, &s.Pace, &s.Speed,
		&s.Calories, &s.Elevation, &s.HeartRate, &s.Cadence, &gpsRoute, &s.Source, &s.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("RunningSession", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get running session: %w", err)
	}
	if gpsRoute.Valid {
		s.GPSRoute = gpsRoute.String
	}
	return s, nil
}

// ListSessionsByUser retrieves running sessions for a user within an optional date range.
func (r *Repository) ListSessionsByUser(ctx context.Context, userID string, fromDate, toDate string, limit, offset int) ([]*domain.RunningSession, error) {
	query := `SELECT id, user_id, date, distance, duration, pace, speed, calories, elevation, heart_rate, cadence, gps_route, source, created_at
		 FROM running_sessions WHERE user_id = ?`
	args := []interface{}{userID}

	if fromDate != "" {
		query += " AND date >= ?"
		args = append(args, fromDate)
	}
	if toDate != "" {
		query += " AND date <= ?"
		args = append(args, toDate)
	}

	query += " ORDER BY date DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list running sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*domain.RunningSession
	for rows.Next() {
		s := &domain.RunningSession{}
		var gpsRoute sql.NullString
		if err := rows.Scan(&s.ID, &s.UserID, &s.Date, &s.Distance, &s.Duration, &s.Pace, &s.Speed,
			&s.Calories, &s.Elevation, &s.HeartRate, &s.Cadence, &gpsRoute, &s.Source, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan running session: %w", err)
		}
		if gpsRoute.Valid {
			s.GPSRoute = gpsRoute.String
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

// CountSessionsByUser returns the total number of sessions for a user within an optional date range.
func (r *Repository) CountSessionsByUser(ctx context.Context, userID string, fromDate, toDate string) (int, error) {
	query := `SELECT COUNT(*) FROM running_sessions WHERE user_id = ?`
	args := []interface{}{userID}

	if fromDate != "" {
		query += " AND date >= ?"
		args = append(args, fromDate)
	}
	if toDate != "" {
		query += " AND date <= ?"
		args = append(args, toDate)
	}

	var count int
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count running sessions: %w", err)
	}
	return count, nil
}

// DeleteSession removes a running session by ID.
func (r *Repository) DeleteSession(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx,
		`DELETE FROM running_sessions WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete running session: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("RunningSession", id)
	}
	return nil
}

// --- Device connection operations ---

// SaveDeviceConnection stores a device connection record.
func (r *Repository) SaveDeviceConnection(ctx context.Context, conn *domain.DeviceConnection) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO device_connections (id, user_id, device_type, is_active, connected_at)
		 VALUES (?, ?, ?, ?, datetime('now'))`,
		conn.ID, conn.UserID, conn.DeviceType, conn.IsActive)
	if err != nil {
		return fmt.Errorf("failed to save device connection: %w", err)
	}
	return nil
}

// GetDeviceConnection retrieves a device connection by its unique identifier.
func (r *Repository) GetDeviceConnection(ctx context.Context, id string) (*domain.DeviceConnection, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, device_type, is_active, connected_at
		 FROM device_connections WHERE id = ?`, id)

	conn := &domain.DeviceConnection{}
	err := row.Scan(&conn.ID, &conn.UserID, &conn.DeviceType, &conn.IsActive, &conn.ConnectedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("DeviceConnection", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get device connection: %w", err)
	}
	return conn, nil
}

// ListDeviceConnectionsByUser retrieves all device connections for a user.
func (r *Repository) ListDeviceConnectionsByUser(ctx context.Context, userID string) ([]*domain.DeviceConnection, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, device_type, is_active, connected_at
		 FROM device_connections WHERE user_id = ? ORDER BY connected_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list device connections: %w", err)
	}
	defer rows.Close()

	var connections []*domain.DeviceConnection
	for rows.Next() {
		conn := &domain.DeviceConnection{}
		if err := rows.Scan(&conn.ID, &conn.UserID, &conn.DeviceType, &conn.IsActive, &conn.ConnectedAt); err != nil {
			return nil, fmt.Errorf("failed to scan device connection: %w", err)
		}
		connections = append(connections, conn)
	}
	return connections, nil
}

// DeactivateDeviceConnection marks a device connection as inactive.
func (r *Repository) DeactivateDeviceConnection(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE device_connections SET is_active = 0 WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to deactivate device connection: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("DeviceConnection", id)
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
