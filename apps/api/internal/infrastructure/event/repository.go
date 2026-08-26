package event

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"

	eventdomain "github.com/innotechlabs01/mr-training-api/internal/domain/event"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements event.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new event repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ListByCoach retrieves all events for a given coach, ordered by date.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*eventdomain.Event, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, title, date, time, end_time, type, modality, location, description,
		 status, format, is_public, running_distance_km, running_pace, running_meeting_point,
		 coach_id, created_at, updated_at
		 FROM events WHERE coach_id = ? ORDER BY date`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list events: %w", err)
	}
	defer rows.Close()

	var events []*eventdomain.Event
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}

		// Load athletes
		athleteIDs, err := r.getAthleteIDs(ctx, e.ID)
		if err != nil {
			return nil, err
		}
		e.AthleteIDs = athleteIDs

		// Load form fields
		formFields, err := r.getFormFields(ctx, e.ID)
		if err != nil {
			return nil, err
		}
		e.FormFields = formFields

		// Load list items
		listItems, err := r.getListItems(ctx, e.ID)
		if err != nil {
			return nil, err
		}
		e.ListItems = listItems

		events = append(events, e)
	}
	return events, nil
}

// GetByID retrieves an event by its unique identifier.
func (r *Repository) GetByID(ctx context.Context, id string) (*eventdomain.Event, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, title, date, time, end_time, type, modality, location, description,
		 status, format, is_public, running_distance_km, running_pace, running_meeting_point,
		 coach_id, created_at, updated_at
		 FROM events WHERE id = ?`, id)

	e, err := scanEventRow(row)
	if err != nil {
		return nil, err
	}

	// Load related data
	athleteIDs, err := r.getAthleteIDs(ctx, e.ID)
	if err != nil {
		return nil, err
	}
	e.AthleteIDs = athleteIDs

	formFields, err := r.getFormFields(ctx, e.ID)
	if err != nil {
		return nil, err
	}
	e.FormFields = formFields

	listItems, err := r.getListItems(ctx, e.ID)
	if err != nil {
		return nil, err
	}
	e.ListItems = listItems

	return e, nil
}

// Create inserts a new event record.
func (r *Repository) Create(ctx context.Context, e *eventdomain.Event) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO events (id, title, date, time, end_time, type, modality, location, description,
		 status, format, is_public, running_distance_km, running_pace, running_meeting_point, coach_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, e.Title, e.Date, e.Time, e.EndTime, e.Type, e.Modality,
		nullString(e.Location), nullString(e.Description), e.Status,
		nullString(e.Format), boolToInt(e.IsPublic),
		e.RunningDistanceKm, nullString(e.RunningPace), nullString(e.RunningMeetingPoint),
		e.CoachID)
	if err != nil {
		return fmt.Errorf("failed to create event: %w", err)
	}
	return nil
}

// Update modifies an existing event record.
func (r *Repository) Update(ctx context.Context, e *eventdomain.Event) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE events SET title=?, date=?, time=?, end_time=?, type=?, modality=?, location=?,
		 description=?, status=?, format=?, is_public=?, running_distance_km=?, running_pace=?,
		 running_meeting_point=?, updated_at=datetime('now') WHERE id=?`,
		e.Title, e.Date, e.Time, e.EndTime, e.Type, e.Modality,
		nullString(e.Location), nullString(e.Description), e.Status,
		nullString(e.Format), boolToInt(e.IsPublic),
		e.RunningDistanceKm, nullString(e.RunningPace), nullString(e.RunningMeetingPoint),
		e.ID)
	if err != nil {
		return fmt.Errorf("failed to update event: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Event", e.ID)
	}
	return nil
}

// Delete removes an event record by ID.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM events WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("failed to delete event: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("Event", id)
	}
	return nil
}

// GetRegistration retrieves a specific athlete's registration for an event.
func (r *Repository) GetRegistration(ctx context.Context, eventID, athleteID string) (*eventdomain.EventRegistration, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, event_id, athlete_id, status, created_at, updated_at
		 FROM event_registrations WHERE event_id = ? AND athlete_id = ?`,
		eventID, athleteID)

	reg := &eventdomain.EventRegistration{}
	err := row.Scan(&reg.ID, &reg.EventID, &reg.AthleteID, &reg.Status, &reg.CreatedAt, &reg.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Registration", eventID+"/"+athleteID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get registration: %w", err)
	}
	return reg, nil
}

// UpsertRegistration creates or updates an athlete's registration for an event.
func (r *Repository) UpsertRegistration(ctx context.Context, reg *eventdomain.EventRegistration) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO event_registrations (id, event_id, athlete_id, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
		 ON CONFLICT(event_id, athlete_id) DO UPDATE SET status = ?, updated_at = datetime('now')`,
		reg.ID, reg.EventID, reg.AthleteID, reg.Status, reg.Status)
	if err != nil {
		return fmt.Errorf("failed to upsert registration: %w", err)
	}
	return nil
}

// ListRegistrationsByAthlete retrieves all events an athlete is registered for.
func (r *Repository) ListRegistrationsByAthlete(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT e.id, e.title, e.date, e.time, e.end_time, e.type, e.modality, e.location,
		 e.description, e.status, e.format, e.is_public, e.running_distance_km, e.running_pace,
		 e.running_meeting_point, e.coach_id, e.created_at, e.updated_at
		 FROM events e
		 INNER JOIN event_registrations er ON e.id = er.event_id
		 WHERE er.athlete_id = ? AND er.status = 'accepted'
		 ORDER BY e.date`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list registrations: %w", err)
	}
	defer rows.Close()

	var events []*eventdomain.Event
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}
		events = append(events, e)
	}
	return events, nil
}

// SetAthletes replaces the athlete list for an event.
func (r *Repository) SetAthletes(ctx context.Context, eventID string, athleteIDs []string) error {
	if _, err := r.db.ExecContext(ctx, `DELETE FROM event_athletes WHERE event_id = ?`, eventID); err != nil {
		return fmt.Errorf("failed to delete event athletes: %w", err)
	}
	for _, athleteID := range athleteIDs {
		if _, err := r.db.ExecContext(ctx,
			`INSERT OR IGNORE INTO event_athletes (event_id, athlete_id) VALUES (?, ?)`,
			eventID, athleteID); err != nil {
			return fmt.Errorf("failed to insert event athlete: %w", err)
		}
	}
	return nil
}

// SetFormFields replaces the form fields for an event.
func (r *Repository) SetFormFields(ctx context.Context, eventID string, fields []eventdomain.EventFormField) error {
	if _, err := r.db.ExecContext(ctx, `DELETE FROM event_form_fields WHERE event_id = ?`, eventID); err != nil {
		return fmt.Errorf("failed to delete form fields: %w", err)
	}
	for _, f := range fields {
		optionsJSON := ""
		if len(f.Options) > 0 {
			b, _ := json.Marshal(f.Options)
			optionsJSON = string(b)
		}
		id := f.ID
		if id == "" {
			id = uuid.New().String()
		}
		if _, err := r.db.ExecContext(ctx,
			`INSERT INTO event_form_fields (id, event_id, label, kind, options, required, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			id, eventID, f.Label, f.Kind, nullString(optionsJSON), boolToInt(f.Required), f.SortOrder); err != nil {
			return fmt.Errorf("failed to insert form field: %w", err)
		}
	}
	return nil
}

// SetListItems replaces the list items for an event.
func (r *Repository) SetListItems(ctx context.Context, eventID string, items []string) error {
	if _, err := r.db.ExecContext(ctx, `DELETE FROM event_list_items WHERE event_id = ?`, eventID); err != nil {
		return fmt.Errorf("failed to delete list items: %w", err)
	}
	for i, item := range items {
		if _, err := r.db.ExecContext(ctx,
			`INSERT INTO event_list_items (id, event_id, item, sort_order) VALUES (?, ?, ?, ?)`,
			uuid.New().String(), eventID, item, i); err != nil {
			return fmt.Errorf("failed to insert list item: %w", err)
		}
	}
	return nil
}

// --- Private helpers ---

func (r *Repository) getAthleteIDs(ctx context.Context, eventID string) ([]string, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT athlete_id FROM event_athletes WHERE event_id = ?`, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query event athletes: %w", err)
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("failed to scan athlete ID: %w", err)
		}
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []string{}
	}
	return ids, nil
}

func (r *Repository) getFormFields(ctx context.Context, eventID string) ([]eventdomain.EventFormField, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, event_id, label, kind, options, required, sort_order
		 FROM event_form_fields WHERE event_id = ? ORDER BY sort_order`, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query form fields: %w", err)
	}
	defer rows.Close()

	var fields []eventdomain.EventFormField
	for rows.Next() {
		f := eventdomain.EventFormField{}
		var options sql.NullString
		var required int
		if err := rows.Scan(&f.ID, &f.EventID, &f.Label, &f.Kind, &options, &required, &f.SortOrder); err != nil {
			return nil, fmt.Errorf("failed to scan form field: %w", err)
		}
		if options.Valid && options.String != "" {
			json.Unmarshal([]byte(options.String), &f.Options)
		}
		f.Required = required == 1
		fields = append(fields, f)
	}
	if fields == nil {
		fields = []eventdomain.EventFormField{}
	}
	return fields, nil
}

func (r *Repository) getListItems(ctx context.Context, eventID string) ([]string, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT item FROM event_list_items WHERE event_id = ? ORDER BY sort_order`, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query list items: %w", err)
	}
	defer rows.Close()

	var items []string
	for rows.Next() {
		var item string
		if err := rows.Scan(&item); err != nil {
			return nil, fmt.Errorf("failed to scan list item: %w", err)
		}
		items = append(items, item)
	}
	if items == nil {
		items = []string{}
	}
	return items, nil
}

// scanEvent scans a row into an Event struct.
type scannable interface {
	Scan(dest ...interface{}) error
}

func scanEventFromRow(s scannable) (*eventdomain.Event, error) {
	e := &eventdomain.Event{}
	var location, description, format, runningPace, runningMeetingPoint sql.NullString
	var runningDistanceKm sql.NullFloat64
	var isPublic int

	err := s.Scan(&e.ID, &e.Title, &e.Date, &e.Time, &e.EndTime, &e.Type, &e.Modality,
		&location, &description, &e.Status, &format, &isPublic,
		&runningDistanceKm, &runningPace, &runningMeetingPoint,
		&e.CoachID, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if location.Valid {
		e.Location = location.String
	}
	if description.Valid {
		e.Description = description.String
	}
	if format.Valid {
		e.Format = format.String
	}
	e.IsPublic = isPublic == 1
	if runningDistanceKm.Valid {
		e.RunningDistanceKm = &runningDistanceKm.Float64
	}
	if runningPace.Valid {
		e.RunningPace = runningPace.String
	}
	if runningMeetingPoint.Valid {
		e.RunningMeetingPoint = runningMeetingPoint.String
	}

	return e, nil
}

func scanEventRow(row *sql.Row) (*eventdomain.Event, error) {
	e, err := scanEventFromRow(row)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Event", "")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan event: %w", err)
	}
	return e, nil
}

func scanEvent(rows *sql.Rows) (*eventdomain.Event, error) {
	return scanEventFromRow(rows)
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
