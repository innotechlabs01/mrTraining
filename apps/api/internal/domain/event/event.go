// Package event defines the core event domain entities for the MR Training API.
// It includes Event, EventRegistration, EventFormField, and EventFormResponse types
// that map to the database schema.
package event

// Event represents a coaching event (session, competition, workshop, etc.).
type Event struct {
	ID                   string           `json:"id"`
	Title                string           `json:"title"`
	Date                 string           `json:"date"`
	Time                 string           `json:"time"`
	EndTime              string           `json:"end_time"`
	Type                 string           `json:"type"`     // "session", "competition", "workshop", "other"
	Modality             string           `json:"modality"` // "presencial", "virtual", "hybrid"
	Location             string           `json:"location"`
	Description          string           `json:"description"`
	Status               string           `json:"status"` // "scheduled", "in_progress", "completed", "cancelled"
	Format               string           `json:"format,omitempty"`
	IsPublic             bool             `json:"is_public"`
	RunningDistanceKm     *float64         `json:"running_distance_km,omitempty"`
	RunningPace          string           `json:"running_pace,omitempty"`
	RunningMeetingPoint  string           `json:"running_meeting_point,omitempty"`
	AthleteIDs           []string         `json:"athlete_ids"`
	FormFields           []EventFormField `json:"form_fields,omitempty"`
	ListItems            []string         `json:"list_items,omitempty"`
	CoachID              string           `json:"coach_id"`
	CreatedAt            string           `json:"created_at"`
	UpdatedAt            string           `json:"updated_at"`
}

// EventRegistration represents an athlete's registration for an event.
type EventRegistration struct {
	ID        string `json:"id"`
	EventID   string `json:"event_id"`
	AthleteID string `json:"athlete_id"`
	Status    string `json:"status"` // "accepted", "cancelled"
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// EventFormField defines a custom field in an event's registration form.
type EventFormField struct {
	ID        string   `json:"id"`
	EventID   string   `json:"event_id"`
	Label     string   `json:"label"`
	Kind      string   `json:"kind"` // "text", "select", "checkbox", "number"
	Options   []string `json:"options,omitempty"`
	Required  bool     `json:"required"`
	SortOrder int      `json:"sort_order"`
}

// EventFormResponse stores an athlete's response to an event form field.
type EventFormResponse struct {
	ID        string `json:"id"`
	EventID   string `json:"event_id"`
	AthleteID string `json:"athlete_id"`
	FieldID   string `json:"field_id"`
	Value     string `json:"value"`
	CreatedAt string `json:"created_at"`
}
