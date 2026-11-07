CREATE TABLE IF NOT EXISTS financial_audit_events (
  id         TEXT PRIMARY KEY,
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  action     TEXT NOT NULL,
  actor_id   TEXT,
  actor_type TEXT NOT NULL DEFAULT 'user',
  payload    TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK (actor_type IN ('user','system'))
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_entity
  ON financial_audit_events(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created
  ON financial_audit_events(created_at);

DROP RULE IF EXISTS trg_financial_audit_no_update ON financial_audit_events;
CREATE RULE trg_financial_audit_no_update
AS ON UPDATE TO financial_audit_events
DO INSTEAD NOTHING;

DROP RULE IF EXISTS trg_financial_audit_no_delete ON financial_audit_events;
CREATE RULE trg_financial_audit_no_delete
AS ON DELETE TO financial_audit_events
DO INSTEAD NOTHING;
