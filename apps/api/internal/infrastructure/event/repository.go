package event

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"

	eventdomain "github.com/innotechlabs01/mr-training-api/internal/domain/event"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements event.Repository using database/sql with Turso/libsql.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a new event repository with the given database connection.
// By default, all queries run against the connection pool. Use SetExecutor to
// inject a *sql.Tx for transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
// When set, all repository queries run against this executor instead of the
// connection pool.
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries. This allows request-scoped
// transactional usage without mutating the shared repository instance.
func (r *Repository) WithExecutor(exec database.Executor) eventdomain.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx (injected by a
// UnitOfWork) rather than the connection pool.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

const eventSelectColumns = `
	id, title, date, time, end_time, type, modality, location, description,
	status, format, is_public,
	max_capacity, COALESCE(price_cents, 0), COALESCE(currency, 'COP'), registration_deadline,
	running_distance_km, running_pace, running_meeting_point,
	running_categories, running_elevation_m, running_route_url,
	(SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = events.id AND er.status = 'accepted') AS accepted_count,
	coach_id, created_at, updated_at`

const eventSelectColumnsAliased = `
	e.id, e.title, e.date, e.time, e.end_time, e.type, e.modality, e.location, e.description,
	e.status, e.format, e.is_public,
	e.max_capacity, COALESCE(e.price_cents, 0), COALESCE(e.currency, 'COP'), e.registration_deadline,
	e.running_distance_km, e.running_pace, e.running_meeting_point,
	e.running_categories, e.running_elevation_m, e.running_route_url,
	(SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'accepted') AS accepted_count,
	e.coach_id, e.created_at, e.updated_at`

// ListByCoach retrieves all events for a given coach, ordered by date.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*eventdomain.Event, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT `+eventSelectColumns+`
		 FROM events WHERE coach_id = $1 ORDER BY date`, coachID)
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
	row := r.exec.QueryRowContext(ctx,
		`SELECT `+eventSelectColumns+`
		 FROM events WHERE id = $1`, id)

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
	categoriesJSON := ""
	if len(e.RunningCategories) > 0 {
		if b, err := json.Marshal(e.RunningCategories); err == nil {
			categoriesJSON = string(b)
		}
	}
	currency := e.Currency
	if currency == "" {
		currency = "COP"
	}
	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO events (
		 id, title, date, time, end_time, type, modality, location, description,
		 status, format, is_public,
		 max_capacity, price_cents, currency, registration_deadline,
		 running_distance_km, running_pace, running_meeting_point,
		 running_categories, running_elevation_m, running_route_url,
		 coach_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
		e.ID, e.Title, e.Date, e.Time, e.EndTime, e.Type, e.Modality,
		nullString(e.Location), nullString(e.Description), e.Status,
		nullString(e.Format), boolToInt(e.IsPublic),
		e.MaxCapacity, e.PriceCents, currency, nullString(e.RegistrationDeadline),
		e.RunningDistanceKm, nullString(e.RunningPace), nullString(e.RunningMeetingPoint),
		nullString(categoriesJSON), e.RunningElevationM, nullString(e.RunningRouteURL),
		e.CoachID)
	if err != nil {
		return fmt.Errorf("failed to create event: %w", err)
	}
	return nil
}

// Update modifies an existing event record.
func (r *Repository) Update(ctx context.Context, e *eventdomain.Event) error {
	categoriesJSON := ""
	if len(e.RunningCategories) > 0 {
		if b, err := json.Marshal(e.RunningCategories); err == nil {
			categoriesJSON = string(b)
		}
	}
	currency := e.Currency
	if currency == "" {
		currency = "COP"
	}
	result, err := r.exec.ExecContext(ctx,
		`UPDATE events SET title=$1, date=$2, time=$3, end_time=$4, type=$5, modality=$6, location=$7,
		 description=$8, status=$9, format=$10, is_public=$11,
		 max_capacity=$12, price_cents=$13, currency=$14, registration_deadline=$15,
		 running_distance_km=$16, running_pace=$17, running_meeting_point=$18,
		 running_categories=$19, running_elevation_m=$20, running_route_url=$21,
		 updated_at=NOW() WHERE id=$22`,
		e.Title, e.Date, e.Time, e.EndTime, e.Type, e.Modality,
		nullString(e.Location), nullString(e.Description), e.Status,
		nullString(e.Format), boolToInt(e.IsPublic),
		e.MaxCapacity, e.PriceCents, currency, nullString(e.RegistrationDeadline),
		e.RunningDistanceKm, nullString(e.RunningPace), nullString(e.RunningMeetingPoint),
		nullString(categoriesJSON), e.RunningElevationM, nullString(e.RunningRouteURL),
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
	result, err := r.exec.ExecContext(ctx, `DELETE FROM events WHERE id = $1`, id)
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
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, event_id, athlete_id, status, created_at, updated_at
		 FROM event_registrations WHERE event_id = $1 AND athlete_id = $2`,
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
	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO event_registrations (id, event_id, athlete_id, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, NOW(), NOW())
		 ON CONFLICT(event_id, athlete_id) DO UPDATE SET status = $4, updated_at = NOW()`,
		reg.ID, reg.EventID, reg.AthleteID, reg.Status)
	if err != nil {
		return fmt.Errorf("failed to upsert registration: %w", err)
	}
	return nil
}

// ListRegistrationsByAthlete retrieves all events an athlete is registered for.
func (r *Repository) ListRegistrationsByAthlete(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT `+eventSelectColumnsAliased+`
		 FROM events e
		 INNER JOIN event_registrations er ON e.id = er.event_id
		 WHERE er.athlete_id = $1 AND er.status = 'accepted'
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

// ListRegistrationsByEvent retrieves all registrations for an event, ordered by creation.
func (r *Repository) ListRegistrationsByEvent(ctx context.Context, eventID string) ([]*eventdomain.EventRegistration, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, event_id, athlete_id, status, created_at, updated_at
		 FROM event_registrations WHERE event_id = $1
		 ORDER BY created_at`, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to list registrations by event: %w", err)
	}
	defer rows.Close()

	regs := make([]*eventdomain.EventRegistration, 0)
	for rows.Next() {
		reg := &eventdomain.EventRegistration{}
		if err := rows.Scan(&reg.ID, &reg.EventID, &reg.AthleteID, &reg.Status, &reg.CreatedAt, &reg.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan registration: %w", err)
		}
		regs = append(regs, reg)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate registrations: %w", err)
	}
	return regs, nil
}

// SetAthletes replaces the athlete list for an event.
func (r *Repository) SetAthletes(ctx context.Context, eventID string, athleteIDs []string) error {
	if _, err := r.exec.ExecContext(ctx, `DELETE FROM event_athletes WHERE event_id = $1`, eventID); err != nil {
		return fmt.Errorf("failed to delete event athletes: %w", err)
	}
	for _, athleteID := range athleteIDs {
		if _, err := r.exec.ExecContext(ctx,
			`INSERT INTO event_athletes (event_id, athlete_id) VALUES ($1, $2)
			 ON CONFLICT (event_id, athlete_id) DO NOTHING`,
			eventID, athleteID); err != nil {
			return fmt.Errorf("failed to insert event athlete: %w", err)
		}
	}
	return nil
}

// SetFormFields replaces the form fields for an event.
func (r *Repository) SetFormFields(ctx context.Context, eventID string, fields []eventdomain.EventFormField) error {
	if _, err := r.exec.ExecContext(ctx, `DELETE FROM event_form_fields WHERE event_id = $1`, eventID); err != nil {
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
		if _, err := r.exec.ExecContext(ctx,
			`INSERT INTO event_form_fields (id, event_id, label, kind, options, required, sort_order)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			id, eventID, f.Label, f.Kind, nullString(optionsJSON), boolToInt(f.Required), f.SortOrder); err != nil {
			return fmt.Errorf("failed to insert form field: %w", err)
		}
	}
	return nil
}

// SetListItems replaces the list items for an event.
func (r *Repository) SetListItems(ctx context.Context, eventID string, items []string) error {
	if _, err := r.exec.ExecContext(ctx, `DELETE FROM event_list_items WHERE event_id = $1`, eventID); err != nil {
		return fmt.Errorf("failed to delete list items: %w", err)
	}
	for i, item := range items {
		if _, err := r.exec.ExecContext(ctx,
			`INSERT INTO event_list_items (id, event_id, item, sort_order) VALUES ($1, $2, $3, $4)`,
			uuid.New().String(), eventID, item, i); err != nil {
			return fmt.Errorf("failed to insert list item: %w", err)
		}
	}
	return nil
}

// GetFormResponses retrieves an athlete's form responses for an event.
func (r *Repository) GetFormResponses(ctx context.Context, eventID, athleteID string) ([]eventdomain.EventFormResponse, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, event_id, athlete_id, field_id, value
		 FROM event_form_responses WHERE event_id = $1 AND athlete_id = $2`,
		eventID, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to query form responses: %w", err)
	}
	defer rows.Close()

	var responses []eventdomain.EventFormResponse
	for rows.Next() {
		var resp eventdomain.EventFormResponse
		if err := rows.Scan(&resp.ID, &resp.EventID, &resp.AthleteID, &resp.FieldID, &resp.Value); err != nil {
			return nil, fmt.Errorf("failed to scan form response: %w", err)
		}
		responses = append(responses, resp)
	}
	return responses, nil
}

// ListFormResponsesByEvent retrieves all form responses for an event (coach view).
func (r *Repository) ListFormResponsesByEvent(ctx context.Context, eventID string) ([]eventdomain.EventFormResponse, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, event_id, athlete_id, field_id, value
		 FROM event_form_responses WHERE event_id = $1
		 ORDER BY athlete_id, created_at`, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query event form responses: %w", err)
	}
	defer rows.Close()

	responses := make([]eventdomain.EventFormResponse, 0)
	for rows.Next() {
		var resp eventdomain.EventFormResponse
		if err := rows.Scan(&resp.ID, &resp.EventID, &resp.AthleteID, &resp.FieldID, &resp.Value); err != nil {
			return nil, fmt.Errorf("failed to scan form response: %w", err)
		}
		responses = append(responses, resp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate form responses: %w", err)
	}
	return responses, nil
}

// SaveFormResponses replaces an athlete's form responses for an event.
func (r *Repository) SaveFormResponses(ctx context.Context, eventID, athleteID string, responses []eventdomain.EventFormResponse) error {
	if _, err := r.exec.ExecContext(ctx,
		`DELETE FROM event_form_responses WHERE event_id = $1 AND athlete_id = $2`,
		eventID, athleteID); err != nil {
		return fmt.Errorf("failed to delete form responses: %w", err)
	}
	for _, resp := range responses {
		if _, err := r.exec.ExecContext(ctx,
			`INSERT INTO event_form_responses (id, event_id, athlete_id, field_id, value, created_at)
			 VALUES ($1, $2, $3, $4, $5, NOW())`,
			uuid.New().String(), eventID, athleteID, resp.FieldID, resp.Value); err != nil {
			return fmt.Errorf("failed to insert form response: %w", err)
		}
	}
	return nil
}

// --- Private helpers ---

func (r *Repository) getAthleteIDs(ctx context.Context, eventID string) ([]string, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT athlete_id FROM event_athletes WHERE event_id = $1`, eventID)
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
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, event_id, label, kind, options, required, sort_order
		 FROM event_form_fields WHERE event_id = $1 ORDER BY sort_order`, eventID)
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
	rows, err := r.exec.QueryContext(ctx,
		`SELECT item FROM event_list_items WHERE event_id = $1 ORDER BY sort_order`, eventID)
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
	var location, description, format, currency, registrationDeadline, runningPace, runningMeetingPoint, runningCategories, runningRouteURL sql.NullString
	var runningDistanceKm sql.NullFloat64
	var maxCapacity, runningElevationM sql.NullInt64
	var isPublic int

	err := s.Scan(&e.ID, &e.Title, &e.Date, &e.Time, &e.EndTime, &e.Type, &e.Modality,
		&location, &description, &e.Status, &format, &isPublic,
		&maxCapacity, &e.PriceCents, &currency, &registrationDeadline,
		&runningDistanceKm, &runningPace, &runningMeetingPoint,
		&runningCategories, &runningElevationM, &runningRouteURL,
		&e.AcceptedCount,
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
	if maxCapacity.Valid {
		v := int(maxCapacity.Int64)
		e.MaxCapacity = &v
	}
	if currency.Valid && currency.String != "" {
		e.Currency = currency.String
	} else {
		e.Currency = "COP"
	}
	if registrationDeadline.Valid {
		e.RegistrationDeadline = registrationDeadline.String
	}
	if runningDistanceKm.Valid {
		e.RunningDistanceKm = &runningDistanceKm.Float64
	}
	if runningPace.Valid {
		e.RunningPace = runningPace.String
	}
	if runningMeetingPoint.Valid {
		e.RunningMeetingPoint = runningMeetingPoint.String
	}
	if runningCategories.Valid && runningCategories.String != "" {
		_ = json.Unmarshal([]byte(runningCategories.String), &e.RunningCategories)
	}
	if runningElevationM.Valid {
		v := int(runningElevationM.Int64)
		e.RunningElevationM = &v
	}
	if runningRouteURL.Valid {
		e.RunningRouteURL = runningRouteURL.String
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

// ListByAthleteLinks retrieves events from every coach the athlete trains
// with (coach_athlete_links JOIN), so athletes see their coach's events.
func (r *Repository) ListByAthleteLinks(ctx context.Context, athleteID string) ([]*eventdomain.Event, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT DISTINCT `+eventSelectColumnsAliased+`
		 FROM events e
		 INNER JOIN coach_athlete_links cal ON e.coach_id = cal.coach_id
		 WHERE cal.athlete_id = $1
		 ORDER BY e.date`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list events by athlete links: %w", err)
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
