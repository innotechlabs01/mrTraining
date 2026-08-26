package dto

// CreateEventRequest is the payload for creating a new event.
type CreateEventRequest struct {
	// Title is the event name (required, 1-200 characters).
	Title string `json:"title"`
	// Date is the event date in YYYY-MM-DD format.
	Date string `json:"date"`
	// Time is the start time in HH:MM format.
	Time string `json:"time"`
	// EndTime is the end time in HH:MM format.
	EndTime string `json:"end_time"`
	// Type is the event type: "session", "competition", "workshop", "other".
	Type string `json:"type"`
	// Modality is the delivery mode: "presencial", "virtual", "hybrid".
	Modality string `json:"modality"`
	// Location is the physical or virtual location.
	Location string `json:"location"`
	// Description is the event description (max 2000 characters).
	Description string `json:"description"`
	// Status is the initial status: "scheduled", "in_progress", "completed", "cancelled".
	Status string `json:"status"`
	// Format is an optional format descriptor (e.g., "5K", "HIIT").
	Format string `json:"format,omitempty"`
	// IsPublic indicates whether the event is visible to non-enrolled athletes.
	IsPublic bool `json:"is_public"`
	// AthleteIDs is the list of athlete IDs to include in the event.
	AthleteIDs []string `json:"athlete_ids"`
	// FormFields defines custom registration form fields.
	FormFields []CreateFormFieldRequest `json:"form_fields,omitempty"`
	// ListItems defines checklist items for the event.
	ListItems []string `json:"list_items,omitempty"`
}

// UpdateEventRequest is the payload for updating an event.
// Empty/zero values are ignored (partial update).
type UpdateEventRequest struct {
	Title       string                  `json:"title,omitempty"`
	Date        string                  `json:"date,omitempty"`
	Time        string                  `json:"time,omitempty"`
	EndTime     string                  `json:"end_time,omitempty"`
	Type        string                  `json:"type,omitempty"`
	Modality    string                  `json:"modality,omitempty"`
	Location    string                  `json:"location,omitempty"`
	Description string                  `json:"description,omitempty"`
	Status      string                  `json:"status,omitempty"`
	Format      string                  `json:"format,omitempty"`
	IsPublic    bool                    `json:"is_public"`
	AthleteIDs  []string                `json:"athlete_ids,omitempty"`
	FormFields  []CreateFormFieldRequest `json:"form_fields,omitempty"`
	ListItems   []string                `json:"list_items,omitempty"`
}

// CreateFormFieldRequest defines a custom form field for an event.
type CreateFormFieldRequest struct {
	ID        string   `json:"id,omitempty"`
	Label     string   `json:"label"`
	Kind      string   `json:"kind"`
	Options   []string `json:"options,omitempty"`
	Required  bool     `json:"required"`
	SortOrder int      `json:"sort_order"`
}

// EventResponse represents an event in API responses.
type EventResponse struct {
	ID                  string             `json:"id"`
	Title               string             `json:"title"`
	Date                string             `json:"date"`
	Time                string             `json:"time"`
	EndTime             string             `json:"end_time"`
	Type                string             `json:"type"`
	Modality            string             `json:"modality"`
	Location            string             `json:"location"`
	Description         string             `json:"description"`
	Status              string             `json:"status"`
	Format              string             `json:"format,omitempty"`
	IsPublic            bool               `json:"is_public"`
	RunningDistanceKm    *float64           `json:"running_distance_km,omitempty"`
	RunningPace         string             `json:"running_pace,omitempty"`
	RunningMeetingPoint string             `json:"running_meeting_point,omitempty"`
	AthleteIDs          []string           `json:"athlete_ids"`
	FormFields          []FormFieldResponse `json:"form_fields,omitempty"`
	ListItems           []string           `json:"list_items,omitempty"`
	CoachID             string             `json:"coach_id"`
	CreatedAt           string             `json:"created_at"`
	UpdatedAt           string             `json:"updated_at"`
}

// FormFieldResponse represents a form field in API responses.
type FormFieldResponse struct {
	ID        string   `json:"id"`
	Label     string   `json:"label"`
	Kind      string   `json:"kind"`
	Options   []string `json:"options,omitempty"`
	Required  bool     `json:"required"`
	SortOrder int      `json:"sort_order"`
}

// EventRegistrationResponse represents an athlete's event registration.
type EventRegistrationResponse struct {
	ID        string `json:"id"`
	EventID   string `json:"event_id"`
	AthleteID string `json:"athlete_id"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}
