-- 019: support_tickets.updated_at — fix HTTP 500 on GET /api/v1/athlete/tickets.
--
-- Root cause: the support repository SELECTs/UPDATEs the column updated_at
-- (see internal/infrastructure/support/repository.go), but the remote dev DB
-- was missing it (PRAGMA table_info listed 13 columns, no updated_at), so every
-- query failed with "no such column: updated_at" and the handler mapped the
-- error to 500.
--
-- Remedy (two parts, same precedent as 015_support_notifications.sql):
--   1. Out-of-band ALTER applied to the remote dev DB (2026-10-16):
--        ALTER TABLE support_tickets ADD COLUMN updated_at TEXT;
--   2. This migration: CREATE TABLE IF NOT EXISTS with the full expected
--      schema so fresh chain-bootstrapped databases get the table WITH
--      updated_at from day one. On the remote dev DB this is a no-op
--      (the table already exists).
--
-- Note: support_tickets/ticket_messages were historically created out-of-band
-- (015 documents the same); the complete table definition lives here now.

CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    ticket_number INTEGER NOT NULL DEFAULT 0,
    subject TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    coach_id TEXT NOT NULL DEFAULT 'system',
    athlete_id TEXT,
    assigned_to TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    resolved_at TEXT
);
