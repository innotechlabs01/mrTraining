-- 403_landing_contacts.sql
-- Public landing-page contact form submissions (name, email, message).
-- Created to support the marketing/contact route migration off direct DB
-- access in apps/web, so the web route now calls the Go API instead of
-- writing to the database directly.
CREATE TABLE IF NOT EXISTS landing_contacts (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_landing_contacts_created_at ON landing_contacts(created_at);
