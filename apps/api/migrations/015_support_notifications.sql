-- Support tickets: add read_at to messages, unread_count to tickets, and athlete_id index.
-- Also ensures ticket_number auto-increments per coach (handled in service).

-- NOTE: the remote dev DB already carries these columns (applied out-of-band
-- before this chain was bootstrappable). ALTERs removed so the chain can
-- proceed; the indexes below remain idempotent (IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_tickets_athlete ON support_tickets(athlete_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_author ON ticket_messages(ticket_id, author);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON ticket_messages(read_at);