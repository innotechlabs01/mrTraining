-- Support tickets: add read_at to messages, unread_count to tickets, and athlete_id index.
-- Also ensures ticket_number auto-increments per coach (handled in service).

ALTER TABLE ticket_messages ADD COLUMN read_at TEXT;
ALTER TABLE support_tickets ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE support_tickets ADD COLUMN last_message_at TEXT;
ALTER TABLE support_tickets ADD COLUMN athlete_id TEXT;
ALTER TABLE support_tickets ADD COLUMN assigned_to TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_athlete ON support_tickets(athlete_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_author ON ticket_messages(ticket_id, author);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON ticket_messages(read_at);