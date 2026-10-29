package running

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/google/uuid"
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
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
		s.ID, s.UserID, s.Date, s.Distance, s.Duration, s.Pace, s.Speed,
		s.Calories, s.Elevation, s.HeartRate, s.Cadence, nullStr(s.GPSRoute), s.Source)
	if err != nil {
		return fmt.Errorf("failed to save running session: %w", err)
	}
	return nil
}

// sessionDeviceColumns is the LEFT JOIN + column list that pulls device
// provenance for a session. Sessions entered by hand have no device row, hence
// the NULL-able scan targets.
//
// Every base column is qualified with the table name: running_session_devices
// also has user_id/source/created_at, so an unqualified projection after the
// join fails with "ambiguous column name".
const sessionColumns = `running_sessions.id, running_sessions.user_id, running_sessions.date, ` +
	`running_sessions.distance, running_sessions.duration, running_sessions.pace, running_sessions.speed, ` +
	`running_sessions.calories, running_sessions.elevation, running_sessions.heart_rate, running_sessions.cadence, ` +
	`running_sessions.gps_route, running_sessions.source, running_sessions.created_at`

const sessionDeviceColumns = `d.external_id, d.device_name, d.device_brand`

const sessionDeviceJoin = `LEFT JOIN running_session_devices d ON d.session_id = running_sessions.id`

// GetSession retrieves a session by its unique identifier.
func (r *Repository) GetSession(ctx context.Context, id string) (*domain.RunningSession, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT `+sessionColumns+`, `+sessionDeviceColumns+`
		 FROM running_sessions `+sessionDeviceJoin+` WHERE running_sessions.id = $14`, id)

	s := &domain.RunningSession{}
	var gpsRoute, externalID, deviceName, deviceBrand sql.NullString
	err := row.Scan(&s.ID, &s.UserID, &s.Date, &s.Distance, &s.Duration, &s.Pace, &s.Speed,
		&s.Calories, &s.Elevation, &s.HeartRate, &s.Cadence, &gpsRoute, &s.Source, &s.CreatedAt,
		&externalID, &deviceName, &deviceBrand)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("RunningSession", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get running session: %w", err)
	}
	if gpsRoute.Valid {
		s.GPSRoute = gpsRoute.String
	}
	s.ExternalID = externalID.String
	s.DeviceName = deviceName.String
	s.DeviceBrand = deviceBrand.String
	return s, nil
}

// ListSessionsByUser retrieves running sessions for a user within an optional date range.
func (r *Repository) ListSessionsByUser(ctx context.Context, userID string, fromDate, toDate string, limit, offset int) ([]*domain.RunningSession, error) {
	query := `SELECT ` + sessionColumns + `, ` + sessionDeviceColumns + `
		 FROM running_sessions ` + sessionDeviceJoin + ` WHERE running_sessions.user_id = $15`
	args := []interface{}{userID}

	if fromDate != "" {
		query += " AND date >= $16"
		args = append(args, fromDate)
	}
	if toDate != "" {
		query += " AND date <= $17"
		args = append(args, toDate)
	}

	query += " ORDER BY running_sessions.date DESC LIMIT $18 OFFSET $19"
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list running sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*domain.RunningSession
	for rows.Next() {
		s := &domain.RunningSession{}
		var gpsRoute, externalID, deviceName, deviceBrand sql.NullString
		if err := rows.Scan(&s.ID, &s.UserID, &s.Date, &s.Distance, &s.Duration, &s.Pace, &s.Speed,
			&s.Calories, &s.Elevation, &s.HeartRate, &s.Cadence, &gpsRoute, &s.Source, &s.CreatedAt,
			&externalID, &deviceName, &deviceBrand); err != nil {
			return nil, fmt.Errorf("failed to scan running session: %w", err)
		}
		if gpsRoute.Valid {
			s.GPSRoute = gpsRoute.String
		}
		s.ExternalID = externalID.String
		s.DeviceName = deviceName.String
		s.DeviceBrand = deviceBrand.String
		sessions = append(sessions, s)
	}
	return sessions, nil
}

// CountSessionsByUser returns the total number of sessions for a user within an optional date range.
func (r *Repository) CountSessionsByUser(ctx context.Context, userID string, fromDate, toDate string) (int, error) {
	query := `SELECT COUNT(*) FROM running_sessions WHERE user_id = $20`
	args := []interface{}{userID}

	if fromDate != "" {
		query += " AND date >= $21"
		args = append(args, fromDate)
	}
	if toDate != "" {
		query += " AND date <= $22"
		args = append(args, toDate)
	}

	var count int
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count running sessions: %w", err)
	}
	return count, nil
}

// UpdateSession persists final metrics of an existing running session.
func (r *Repository) UpdateSession(ctx context.Context, s *domain.RunningSession) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE running_sessions
		 SET date = $23, distance = $24, duration = $25, pace = $26, speed = $27, calories = $28,
		     elevation = $29, heart_rate = $30, cadence = $31, gps_route = $32
		 WHERE id = $33`,
		s.Date, s.Distance, s.Duration, s.Pace, s.Speed, s.Calories,
		s.Elevation, s.HeartRate, s.Cadence, nullStr(s.GPSRoute), s.ID)
	if err != nil {
		return fmt.Errorf("failed to update running session: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("RunningSession", s.ID)
	}
	return nil
}

// DeleteSession removes a running session by ID.
func (r *Repository) DeleteSession(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx,
		`DELETE FROM running_sessions WHERE id = $34`, id)
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

// --- Device provenance operations ---

// SaveSessionDevice records which wearable wrote a session.
func (r *Repository) SaveSessionDevice(ctx context.Context, s *domain.RunningSession) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO running_session_devices (session_id, user_id, external_id, source, device_name, device_brand)
		 VALUES ($35, $36, $37, $38, $39, $40)`,
		s.ID, s.UserID, s.ExternalID, s.Source, nullStr(s.DeviceName), nullStr(s.DeviceBrand))
	if err != nil {
		return fmt.Errorf("failed to save running session device: %w", err)
	}
	return nil
}

// GetSessionIDByExternalID reports whether a device workout was already imported.
func (r *Repository) GetSessionIDByExternalID(ctx context.Context, userID, externalID string) (string, bool, error) {
	var sessionID string
	err := r.db.QueryRowContext(ctx,
		`SELECT session_id FROM running_session_devices WHERE user_id = $41 AND external_id = $42`,
		userID, externalID).Scan(&sessionID)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, fmt.Errorf("failed to look up running session by external id: %w", err)
	}
	return sessionID, true, nil
}

// --- GPS point operations ---

// SaveGpsPoint persists a single GPS sample for a running session.
func (r *Repository) SaveGpsPoint(ctx context.Context, p *domain.GpsPoint) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO running_gps_points (id, session_id, lat, lng, alt, timestamp, accuracy)
		 VALUES ($43, $44, $45, $46, $47, $48, $49)`,
		p.ID, p.SessionID, p.Lat, p.Lng, p.Alt, p.Timestamp, p.Accuracy)
	if err != nil {
		return fmt.Errorf("failed to save gps point: %w", err)
	}
	return nil
}

// SaveGpsPoints persists a batch of GPS samples in a single transaction.
// Empty slices are a no-op. All-or-nothing: any failure rolls back.
func (r *Repository) SaveGpsPoints(ctx context.Context, points []*domain.GpsPoint) error {
	if len(points) == 0 {
		return nil
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin gps batch tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // no-op after commit

	stmt, err := tx.PrepareContext(ctx,
		`INSERT INTO running_gps_points (id, session_id, lat, lng, alt, timestamp, accuracy)
		 VALUES ($50, $51, $52, $53, $54, $55, $56)`)
	if err != nil {
		return fmt.Errorf("failed to prepare gps batch stmt: %w", err)
	}
	defer stmt.Close()

	for _, p := range points {
		if _, err := stmt.ExecContext(ctx, p.ID, p.SessionID, p.Lat, p.Lng, p.Alt, p.Timestamp, p.Accuracy); err != nil {
			return fmt.Errorf("failed to save gps point in batch: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit gps batch: %w", err)
	}
	return nil
}

// ListGpsPointsBySession returns all GPS points for a session ordered by timestamp ascending.
func (r *Repository) ListGpsPointsBySession(ctx context.Context, sessionID string) ([]*domain.GpsPoint, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, session_id, lat, lng, alt, timestamp, accuracy
		 FROM running_gps_points WHERE session_id = $57 ORDER BY timestamp ASC`, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to list gps points: %w", err)
	}
	defer rows.Close()

	var points []*domain.GpsPoint
	for rows.Next() {
		p := &domain.GpsPoint{}
		if err := rows.Scan(&p.ID, &p.SessionID, &p.Lat, &p.Lng, &p.Alt, &p.Timestamp, &p.Accuracy); err != nil {
			return nil, fmt.Errorf("failed to scan gps point: %w", err)
		}
		points = append(points, p)
	}
	if points == nil {
		points = []*domain.GpsPoint{}
	}
	return points, nil
}

// --- Device connection operations ---

// SaveDeviceConnection stores a device connection record.
func (r *Repository) SaveDeviceConnection(ctx context.Context, conn *domain.DeviceConnection) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO device_connections (id, user_id, device_type, is_active, connected_at)
		 VALUES ($58, $59, $60, $61, NOW())`,
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
		 FROM device_connections WHERE id = $62`, id)

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
		 FROM device_connections WHERE user_id = $63 ORDER BY connected_at DESC`, userID)
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
		`UPDATE device_connections SET is_active = 0 WHERE id = $64`, id)
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

// --- Running workout template operations ---

func (r *Repository) SaveTemplate(ctx context.Context, t *domain.RunningWorkoutTemplate) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	now := time.Now()
	if t.CreatedAt.IsZero() {
		t.CreatedAt = now
	}
	t.UpdatedAt = now

	segmentsJSON, err := json.Marshal(t.Segments)
	if err != nil {
		return fmt.Errorf("marshal segments: %w", err)
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO running_workout_templates
			(id, coach_id, name, description, type, target_pace_min_per_km, target_pace_max_per_km,
			 target_heart_rate_min, target_heart_rate_max, target_cadence, target_distance_km,
			 target_duration_sec, segments, created_at, updated_at, version)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		 ON CONFLICT (id) DO UPDATE SET
			coach_id = EXCLUDED.coach_id,
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			type = EXCLUDED.type,
			target_pace_min_per_km = EXCLUDED.target_pace_min_per_km,
			target_pace_max_per_km = EXCLUDED.target_pace_max_per_km,
			target_heart_rate_min = EXCLUDED.target_heart_rate_min,
			target_heart_rate_max = EXCLUDED.target_heart_rate_max,
			target_cadence = EXCLUDED.target_cadence,
			target_distance_km = EXCLUDED.target_distance_km,
			target_duration_sec = EXCLUDED.target_duration_sec,
			segments = EXCLUDED.segments,
			updated_at = EXCLUDED.updated_at,
			version = running_workout_templates.version + 1
	`,
		t.ID, t.CoachID, t.Name, t.Description, t.Type,
		nullFloat64(t.TargetPaceMinPerKm), nullFloat64(t.TargetPaceMaxPerKm),
		nullInt(t.TargetHeartRateMin), nullInt(t.TargetHeartRateMax), nullInt(t.TargetCadence),
		nullFloat64(t.TargetDistanceKm), nullInt(t.TargetDurationSec),
		segmentsJSON, t.CreatedAt, t.UpdatedAt, t.Version,
	)
	if err != nil {
		return fmt.Errorf("save running workout template: %w", err)
	}
	return nil
}

func (r *Repository) GetTemplate(ctx context.Context, id string) (*domain.RunningWorkoutTemplate, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, coach_id, name, description, type, target_pace_min_per_km, target_pace_max_per_km,
			target_heart_rate_min, target_heart_rate_max, target_cadence, target_distance_km,
			target_duration_sec, segments, created_at, updated_at, deleted_at, version
		 FROM running_workout_templates WHERE id = $1 AND deleted_at IS NULL`, id)

	t := &domain.RunningWorkoutTemplate{}
	var deletedAt sql.NullTime
	var segmentsJSON []byte
	err := row.Scan(&t.ID, &t.CoachID, &t.Name, &t.Description, &t.Type,
		&t.TargetPaceMinPerKm, &t.TargetPaceMaxPerKm,
		&t.TargetHeartRateMin, &t.TargetHeartRateMax, &t.TargetCadence,
		&t.TargetDistanceKm, &t.TargetDurationSec,
		&segmentsJSON, &t.CreatedAt, &t.UpdatedAt, &deletedAt, &t.Version)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("RunningWorkoutTemplate", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get running workout template: %w", err)
	}
	if deletedAt.Valid {
		t.DeletedAt = &deletedAt.Time
	}
	if err := json.Unmarshal(segmentsJSON, &t.Segments); err != nil {
		return nil, fmt.Errorf("unmarshal segments: %w", err)
	}
	return t, nil
}

func (r *Repository) ListTemplatesByCoach(ctx context.Context, coachID string) ([]*domain.RunningWorkoutTemplate, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, coach_id, name, description, type, target_pace_min_per_km, target_pace_max_per_km,
			target_heart_rate_min, target_heart_rate_max, target_cadence, target_distance_km,
			target_duration_sec, segments, created_at, updated_at, version
		 FROM running_workout_templates WHERE coach_id = $1 AND deleted_at IS NULL
		 ORDER BY created_at DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("list running workout templates: %w", err)
	}
	defer rows.Close()

	var templates []*domain.RunningWorkoutTemplate
	for rows.Next() {
		t := &domain.RunningWorkoutTemplate{}
		var segmentsJSON []byte
		if err := rows.Scan(&t.ID, &t.CoachID, &t.Name, &t.Description, &t.Type,
			&t.TargetPaceMinPerKm, &t.TargetPaceMaxPerKm,
			&t.TargetHeartRateMin, &t.TargetHeartRateMax, &t.TargetCadence,
			&t.TargetDistanceKm, &t.TargetDurationSec,
			&segmentsJSON, &t.CreatedAt, &t.UpdatedAt, &t.Version); err != nil {
			return nil, fmt.Errorf("scan running workout template: %w", err)
		}
		if err := json.Unmarshal(segmentsJSON, &t.Segments); err != nil {
			return nil, fmt.Errorf("unmarshal segments: %w", err)
		}
		templates = append(templates, t)
	}
	if templates == nil {
		templates = []*domain.RunningWorkoutTemplate{}
	}
	return templates, nil
}

func (r *Repository) DeleteTemplate(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE running_workout_templates SET deleted_at = $2 WHERE id = $1 AND deleted_at IS NULL`,
		id, time.Now())
	if err != nil {
		return fmt.Errorf("delete running workout template: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("RunningWorkoutTemplate", id)
	}
	return nil
}

// --- Running workout segment operations ---

func (r *Repository) SaveSegment(ctx context.Context, s *domain.RunningWorkoutSegment) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	now := time.Now()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO running_workout_segments
			(id, template_id, order_index, type, instruction, spoken_instruction,
			 target_duration_sec, target_distance_km, target_pace_min_per_km, target_pace_max_per_km,
			 target_heart_rate_min, target_heart_rate_max, repetitions, recovery_sec,
			 completion_criteria, created_at, updated_at, version)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		 ON CONFLICT (id) DO UPDATE SET
			template_id = EXCLUDED.template_id,
			order_index = EXCLUDED.order_index,
			type = EXCLUDED.type,
			instruction = EXCLUDED.instruction,
			spoken_instruction = EXCLUDED.spoken_instruction,
			target_duration_sec = EXCLUDED.target_duration_sec,
			target_distance_km = EXCLUDED.target_distance_km,
			target_pace_min_per_km = EXCLUDED.target_pace_min_per_km,
			target_pace_max_per_km = EXCLUDED.target_pace_max_per_km,
			target_heart_rate_min = EXCLUDED.target_heart_rate_min,
			target_heart_rate_max = EXCLUDED.target_heart_rate_max,
			repetitions = EXCLUDED.repetitions,
			recovery_sec = EXCLUDED.recovery_sec,
			completion_criteria = EXCLUDED.completion_criteria,
			updated_at = EXCLUDED.updated_at,
			version = running_workout_segments.version + 1
	`,
		s.ID, s.TemplateID, s.OrderIndex, s.Type, s.Instruction, s.SpokenInstruction,
		nullInt(s.TargetDurationSec), nullFloat64(s.TargetDistanceKm),
		nullFloat64(s.TargetPaceMinPerKm), nullFloat64(s.TargetPaceMaxPerKm),
		nullInt(s.TargetHeartRateMin), nullInt(s.TargetHeartRateMax),
		nullInt(s.Repetitions), nullInt(s.RecoverySec), s.CompletionCriteria,
		s.CreatedAt, s.UpdatedAt, s.Version,
	)
	if err != nil {
		return fmt.Errorf("save running workout segment: %w", err)
	}
	return nil
}

func (r *Repository) ListSegmentsByTemplate(ctx context.Context, templateID string) ([]*domain.RunningWorkoutSegment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, template_id, order_index, type, instruction, spoken_instruction,
			target_duration_sec, target_distance_km, target_pace_min_per_km, target_pace_max_per_km,
			target_heart_rate_min, target_heart_rate_max, repetitions, recovery_sec,
			completion_criteria, created_at, updated_at, version
		 FROM running_workout_segments WHERE template_id = $1 AND deleted_at IS NULL
		 ORDER BY order_index`, templateID)
	if err != nil {
		return nil, fmt.Errorf("list running workout segments: %w", err)
	}
	defer rows.Close()

	var segments []*domain.RunningWorkoutSegment
	for rows.Next() {
		s := &domain.RunningWorkoutSegment{}
		if err := rows.Scan(&s.ID, &s.TemplateID, &s.OrderIndex, &s.Type, &s.Instruction, &s.SpokenInstruction,
			&s.TargetDurationSec, &s.TargetDistanceKm, &s.TargetPaceMinPerKm, &s.TargetPaceMaxPerKm,
			&s.TargetHeartRateMin, &s.TargetHeartRateMax, &s.Repetitions, &s.RecoverySec,
			&s.CompletionCriteria, &s.CreatedAt, &s.UpdatedAt, &s.Version); err != nil {
			return nil, fmt.Errorf("scan running workout segment: %w", err)
		}
		segments = append(segments, s)
	}
	if segments == nil {
		segments = []*domain.RunningWorkoutSegment{}
	}
	return segments, nil
}

// --- Running workout assignment operations ---

func (r *Repository) SaveAssignment(ctx context.Context, a *domain.RunningWorkoutAssignment) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	now := time.Now()
	if a.CreatedAt.IsZero() {
		a.CreatedAt = now
	}
	a.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO running_workout_assignments
			(id, template_id, athlete_id, coach_id, scheduled_date, status, athlete_instructions,
			 created_at, updated_at, version)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (id) DO UPDATE SET
			template_id = EXCLUDED.template_id,
			athlete_id = EXCLUDED.athlete_id,
			coach_id = EXCLUDED.coach_id,
			scheduled_date = EXCLUDED.scheduled_date,
			status = EXCLUDED.status,
			athlete_instructions = EXCLUDED.athlete_instructions,
			updated_at = EXCLUDED.updated_at,
			version = running_workout_assignments.version + 1
	`,
		a.ID, a.TemplateID, a.AthleteID, a.CoachID, a.ScheduledDate, a.Status,
		a.AthleteInstructions, a.CreatedAt, a.UpdatedAt, a.Version,
	)
	if err != nil {
		return fmt.Errorf("save running workout assignment: %w", err)
	}
	return nil
}

func (r *Repository) GetAssignment(ctx context.Context, id string) (*domain.RunningWorkoutAssignment, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, template_id, athlete_id, coach_id, scheduled_date, status, athlete_instructions,
			created_at, updated_at, deleted_at, version
		 FROM running_workout_assignments WHERE id = $1 AND deleted_at IS NULL`, id)

	a := &domain.RunningWorkoutAssignment{}
	var deletedAt sql.NullTime
	err := row.Scan(&a.ID, &a.TemplateID, &a.AthleteID, &a.CoachID, &a.ScheduledDate, &a.Status,
		&a.AthleteInstructions, &a.CreatedAt, &a.UpdatedAt, &deletedAt, &a.Version)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("RunningWorkoutAssignment", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get running workout assignment: %w", err)
	}
	if deletedAt.Valid {
		a.DeletedAt = &deletedAt.Time
	}
	return a, nil
}

func (r *Repository) ListAssignmentsByAthlete(ctx context.Context, athleteID string, status domain.RunningWorkoutAssignmentStatus) ([]*domain.RunningWorkoutAssignment, error) {
	query := `
		SELECT id, template_id, athlete_id, coach_id, scheduled_date, status, athlete_instructions,
			created_at, updated_at, version
		 FROM running_workout_assignments WHERE athlete_id = $1 AND deleted_at IS NULL`
	args := []interface{}{athleteID}

	if status != "" {
		query += " AND status = $2"
		args = append(args, status)
	}
	query += " ORDER BY scheduled_date DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list running workout assignments by athlete: %w", err)
	}
	defer rows.Close()

	var assignments []*domain.RunningWorkoutAssignment
	for rows.Next() {
		a := &domain.RunningWorkoutAssignment{}
		if err := rows.Scan(&a.ID, &a.TemplateID, &a.AthleteID, &a.CoachID, &a.ScheduledDate, &a.Status,
			&a.AthleteInstructions, &a.CreatedAt, &a.UpdatedAt, &a.Version); err != nil {
			return nil, fmt.Errorf("scan running workout assignment: %w", err)
		}
		assignments = append(assignments, a)
	}
	if assignments == nil {
		assignments = []*domain.RunningWorkoutAssignment{}
	}
	return assignments, nil
}

func (r *Repository) ListAssignmentsByCoach(ctx context.Context, coachID string) ([]*domain.RunningWorkoutAssignment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, template_id, athlete_id, coach_id, scheduled_date, status, athlete_instructions,
			created_at, updated_at, version
		 FROM running_workout_assignments WHERE coach_id = $1 AND deleted_at IS NULL
		 ORDER BY scheduled_date DESC`, coachID)
	if err != nil {
		return nil, fmt.Errorf("list running workout assignments by coach: %w", err)
	}
	defer rows.Close()

	var assignments []*domain.RunningWorkoutAssignment
	for rows.Next() {
		a := &domain.RunningWorkoutAssignment{}
		if err := rows.Scan(&a.ID, &a.TemplateID, &a.AthleteID, &a.CoachID, &a.ScheduledDate, &a.Status,
			&a.AthleteInstructions, &a.CreatedAt, &a.UpdatedAt, &a.Version); err != nil {
			return nil, fmt.Errorf("scan running workout assignment: %w", err)
		}
		assignments = append(assignments, a)
	}
	if assignments == nil {
		assignments = []*domain.RunningWorkoutAssignment{}
	}
	return assignments, nil
}

func (r *Repository) UpdateAssignmentStatus(ctx context.Context, id string, status domain.RunningWorkoutAssignmentStatus) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE running_workout_assignments SET status = $2, updated_at = $3 WHERE id = $1 AND deleted_at IS NULL`,
		id, status, time.Now())
	if err != nil {
		return fmt.Errorf("update running workout assignment status: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("RunningWorkoutAssignment", id)
	}
	return nil
}

// --- Running workout snapshot operations ---

func (r *Repository) SaveSnapshot(ctx context.Context, s *domain.RunningWorkoutSnapshot) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	if s.CapturedAt.IsZero() {
		s.CapturedAt = time.Now()
	}

	templateCopyJSON, err := json.Marshal(s.TemplateCopy)
	if err != nil {
		return fmt.Errorf("marshal template copy: %w", err)
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO running_workout_snapshots
			(id, assignment_id, session_id, template_copy, captured_at)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (session_id) DO UPDATE SET
			assignment_id = EXCLUDED.assignment_id,
			template_copy = EXCLUDED.template_copy,
			captured_at = EXCLUDED.captured_at
	`,
		s.ID, s.AssignmentID, s.SessionID, string(templateCopyJSON), s.CapturedAt,
	)
	if err != nil {
		return fmt.Errorf("save running workout snapshot: %w", err)
	}
	return nil
}

func (r *Repository) GetSnapshotBySession(ctx context.Context, sessionID string) (*domain.RunningWorkoutSnapshot, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, assignment_id, session_id, template_copy, captured_at
		 FROM running_workout_snapshots WHERE session_id = $1`, sessionID)

	s := &domain.RunningWorkoutSnapshot{}
	var templateCopy []byte
	err := row.Scan(&s.ID, &s.AssignmentID, &s.SessionID, &templateCopy, &s.CapturedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("RunningWorkoutSnapshot", sessionID)
	}
	if err != nil {
		return nil, fmt.Errorf("get running workout snapshot: %w", err)
	}
	s.TemplateCopy = string(templateCopy)
	return s, nil
}

// nullFloat64 converts a *float64 to sql.NullFloat64.
func nullFloat64(v *float64) sql.NullFloat64 {
	if v == nil {
		return sql.NullFloat64{}
	}
	return sql.NullFloat64{Float64: *v, Valid: true}
}

// nullInt converts a *int to sql.NullInt64.
func nullInt(v *int) sql.NullInt64 {
	if v == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: int64(*v), Valid: true}
}

// nullStr converts an empty string to sql.NullString with Valid=false.
func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
