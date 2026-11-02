-- Event registrations: track an athlete's acceptance/cancellation and their form answers.

CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL,
  status TEXT NOT NULL,               -- 'accepted' | 'cancelled'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_form_responses (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_registration_event_athlete ON event_registrations(event_id, athlete_id);
CREATE INDEX IF NOT EXISTS idx_registration_event_athlete ON event_registrations(event_id, athlete_id);
CREATE INDEX IF NOT EXISTS idx_form_response_event_athlete ON event_form_responses(event_id, athlete_id);
