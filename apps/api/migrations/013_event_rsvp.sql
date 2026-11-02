-- Public RSVP + attendance.
-- Allows anonymous invitees (no account) to confirm/cancel attendance via a
-- public link, and lets coaches see who confirmed and the totals.
-- Extends event_registrations with attendee identity and a response token that
-- guests use to update or cancel their own RSVP.

-- NOTE: the remote dev DB already carries the RSVP columns (applied
-- out-of-band before this migration chain was bootstrappable). The ALTER
-- statements are intentionally removed so the chain can proceed; the
-- indexes below remain idempotent (IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_registration_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registration_token ON event_registrations(response_token);
CREATE INDEX IF NOT EXISTS idx_registration_event_email ON event_registrations(event_id, attendee_email);