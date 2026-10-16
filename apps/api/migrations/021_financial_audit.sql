-- Financial audit trail (append-only), Phase B.
-- Every covered mutation must write its audit event in the SAME transaction as
-- the mutation itself; the operation is rolled back if the audit insert fails.
-- Append-only is enforced at the database level with triggers (H-05), so an
-- UPDATE or DELETE aborts regardless of application bugs.

CREATE TABLE IF NOT EXISTS financial_audit_events (
  id         TEXT PRIMARY KEY,
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  action     TEXT NOT NULL,
  actor_id   TEXT,
  actor_type TEXT NOT NULL DEFAULT 'user',
  payload    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (actor_type IN ('user','system'))
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_entity
  ON financial_audit_events(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created
  ON financial_audit_events(created_at);

CREATE TRIGGER IF NOT EXISTS trg_financial_audit_no_update
BEFORE UPDATE ON financial_audit_events
BEGIN
  SELECT RAISE(ABORT, 'financial_audit_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_financial_audit_no_delete
BEFORE DELETE ON financial_audit_events
BEGIN
  SELECT RAISE(ABORT, 'financial_audit_events is append-only');
END;
