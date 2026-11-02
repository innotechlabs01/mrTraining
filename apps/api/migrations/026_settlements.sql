-- Ally settlements (liquidaciones mensuales) and external coach payments (pagos externos), Phase F.
-- Additive only: references `coach_ally_relationships`, `allies`, `commission_entries` (created in
-- earlier phases). No existing tables or columns are modified.
--
-- coach_settlements: monthly settlement grouped by coach (beneficiary) + ally (payer) + period + currency.
-- MVP currency is COP only (CHECK constraint). Currency is included in the unique key (H-08).
-- Status machine: draft → calculated → under_review → approved → document_issued → paid_external,
--                  ↘ void (from draft|calculated|under_review), disputed ← (from approved+).
-- Immutable from approved (H-10): closed_at is set at approved; settlement_items cannot be changed.
--
-- settlement_items: one commission entry per settlement; an entry belongs to at most one active
-- settlement (uq_settlement_item_active on released_at IS NULL). Voiding releases items for re-settlement.
--
-- settlement_documents: downloadable draft reports (CSV/markdown). Marked draft; no fiscal/legal claim.
--
-- coach_payment_records: external direct payment ally→coach (H-09). declared|confirmed status.
-- Confirmed requires explicit review action. MR Training never collects/custodies/distributes funds.

CREATE TABLE IF NOT EXISTS coach_settlements (
  id                 TEXT PRIMARY KEY,
  coach_id           TEXT NOT NULL,                       -- Clerk user id del coach (beneficiario)
  ally_id            TEXT NOT NULL REFERENCES allies(id), -- pagador contractual
  period_start       TEXT NOT NULL,                       -- YYYY-MM-DD (APP_TIMEZONE)
  period_end         TEXT NOT NULL,                       -- YYYY-MM-DD (APP_TIMEZONE)
  period_key         TEXT NOT NULL,                       -- YYYY-MM (APP_TIMEZONE)
  currency           TEXT NOT NULL DEFAULT 'COP',
  status             TEXT NOT NULL DEFAULT 'draft',       -- draft|calculated|under_review|approved|document_issued|paid_external|disputed|void
  operations_count   INTEGER NOT NULL DEFAULT 0,
  base_total_cents   INTEGER NOT NULL DEFAULT 0,
  commission_gross_cents INTEGER NOT NULL DEFAULT 0,
  adjustments_cents  INTEGER NOT NULL DEFAULT 0,
  commission_net_cents INTEGER NOT NULL DEFAULT 0,
  calculated_at      TEXT,
  approved_at        TEXT,
  closed_at          TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (coach_id, ally_id, period_key, currency),
  CHECK (currency = 'COP'),
  CHECK (status IN ('draft','calculated','under_review','approved','document_issued','paid_external','disputed','void'))
);

CREATE INDEX IF NOT EXISTS idx_coach_settlements_coach ON coach_settlements(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_settlements_ally ON coach_settlements(ally_id);
CREATE INDEX IF NOT EXISTS idx_coach_settlements_period ON coach_settlements(period_key);
CREATE INDEX IF NOT EXISTS idx_coach_settlements_status ON coach_settlements(status);

CREATE TABLE IF NOT EXISTS settlement_items (
  id             TEXT PRIMARY KEY,
  settlement_id  TEXT NOT NULL REFERENCES coach_settlements(id),
  entry_id       TEXT NOT NULL REFERENCES commission_entries(id),
  base_cents     INTEGER NOT NULL,
  rate_bps       INTEGER NOT NULL,
  amount_cents   INTEGER NOT NULL,
  released_at    TEXT,                                     -- set when settlement is voided
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (settlement_id, entry_id),
  CHECK (base_cents >= 0),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (amount_cents >= 0)
);

-- An entry belongs to at most one ACTIVE settlement; voiding releases (released_at) for re-settlement.
CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_item_active
  ON settlement_items(entry_id)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement ON settlement_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_entry ON settlement_items(entry_id);

CREATE TABLE IF NOT EXISTS settlement_documents (
  id            TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL REFERENCES coach_settlements(id),
  kind          TEXT NOT NULL DEFAULT 'draft_account_of_collection',
  content_ref   TEXT,                                       -- private evidence path, never public URL (H-04)
  status        TEXT NOT NULL DEFAULT 'draft',             -- draft|reviewed|approved
  version       INTEGER NOT NULL DEFAULT 1,
  generated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at       TEXT,
  CHECK (status IN ('draft','reviewed','approved'))
);

CREATE INDEX IF NOT EXISTS idx_settlement_documents_settlement ON settlement_documents(settlement_id);

CREATE TABLE IF NOT EXISTS coach_payment_records (
  id             TEXT PRIMARY KEY,
  settlement_id  TEXT NOT NULL REFERENCES coach_settlements(id),
  coach_id       TEXT NOT NULL,                            -- Clerk user id del coach (beneficiario)
  payer_ally_id  TEXT NOT NULL REFERENCES allies(id),      -- aliado que paga
  amount_cents   INTEGER NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'COP',
  actor_id       TEXT NOT NULL,                            -- quien declara/confirma
  actor_type     TEXT NOT NULL DEFAULT 'user',             -- user|system
  reference      TEXT,
  evidence_ref   TEXT,                                     -- private evidence path
  declared_at    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'declared',         -- declared|confirmed
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (actor_type IN ('user','system')),
  CHECK (status IN ('declared','confirmed')),
  CHECK (amount_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_coach_payment_records_settlement ON coach_payment_records(settlement_id);
CREATE INDEX IF NOT EXISTS idx_coach_payment_records_coach ON coach_payment_records(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_payment_records_ally ON coach_payment_records(payer_ally_id);
CREATE INDEX IF NOT EXISTS idx_coach_payment_records_status ON coach_payment_records(status);
