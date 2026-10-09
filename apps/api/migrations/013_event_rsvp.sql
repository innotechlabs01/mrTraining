-- Public RSVP + attendance.
-- Allows anonymous invitees (no account) to confirm/cancel attendance via a
-- public link, and lets coaches see who confirmed and the totals.
-- Extends event_registrations with attendee identity and a response token that
-- guests use to update or cancel their own RSVP.

ALTER TABLE event_registrations ADD COLUMN attendee_name TEXT NOT NULL DEFAULT '';
ALTER TABLE event_registrations ADD COLUMN attendee_email TEXT NOT NULL DEFAULT '';
ALTER TABLE event_registrations ADD COLUMN attendee_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE event_registrations ADD COLUMN response_token TEXT NOT NULL DEFAULT '';
ALTER TABLE event_registrations ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_registration_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registration_token ON event_registrations(response_token);
CREATE INDEX IF NOT EXISTS idx_registration_event_email ON event_registrations(event_id, attendee_email);