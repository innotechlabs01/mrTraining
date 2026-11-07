-- 412_wompi_payment_ledger.sql
-- Internal-only accounting ledger for payments received through Wompi.
-- Accounting only: no payout/disbursement is represented as "paid" without an
-- external third-party confirmation. Coach Settlements remain unchanged.

CREATE TABLE IF NOT EXISTS platform_commission_terms (
  id             TEXT PRIMARY KEY,
  coach_id       TEXT,
  version        INTEGER NOT NULL DEFAULT 1,
  rate_bps       INTEGER NOT NULL DEFAULT 0,
  fixed_fee_cents INTEGER NOT NULL DEFAULT 0,
  processing_bps INTEGER NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'COP',
  status         TEXT NOT NULL DEFAULT 'proposed',
  valid_from     TEXT NOT NULL,
  valid_to       TEXT,
  created_at     TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK (status IN ('proposed','active','superseded','ended')),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (processing_bps >= 0 AND processing_bps <= 100000),
  CHECK (fixed_fee_cents >= 0)
);

CREATE TABLE IF NOT EXISTS wompi_payment_ledger (
  id                        TEXT PRIMARY KEY,
  wompi_transaction_id      TEXT NOT NULL UNIQUE,
  source_type               TEXT NOT NULL DEFAULT 'membership_payment',
  membership_payment_id     TEXT,
  order_id                  TEXT,
  subscription_id           TEXT,
  athlete_id                TEXT NOT NULL,
  coach_id                  TEXT NOT NULL,
  gross_amount_cents        BIGINT NOT NULL,
  processing_fee_cents      BIGINT NOT NULL DEFAULT 0,
  platform_commission_cents BIGINT NOT NULL DEFAULT 0,
  coach_net_payable_cents   BIGINT NOT NULL DEFAULT 0,
  adjustments_cents         BIGINT NOT NULL DEFAULT 0,
  currency                  TEXT NOT NULL DEFAULT 'COP',
  period_start              TEXT NOT NULL,
  period_end                TEXT NOT NULL,
  payment_period            TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'pending',
  commission_term_id        TEXT,
  commission_term_version   INTEGER NOT NULL DEFAULT 0,
  reversed_entry_id         TEXT,
  settlement_reference      TEXT,
  settled_at                TEXT,
  idempotency_key           TEXT,
  created_at                TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at                TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK (source_type IN ('membership_payment','store_order')),
  CHECK (status IN ('pending','approved','held','payable','settled','reversed')),
  CHECK (gross_amount_cents >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wompi_ledger_idempotency
  ON wompi_payment_ledger(idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

CREATE INDEX IF NOT EXISTS idx_wompi_ledger_coach ON wompi_payment_ledger(coach_id);
CREATE INDEX IF NOT EXISTS idx_wompi_ledger_athlete ON wompi_payment_ledger(athlete_id);
CREATE INDEX IF NOT EXISTS idx_wompi_ledger_status ON wompi_payment_ledger(status);
CREATE INDEX IF NOT EXISTS idx_wompi_ledger_period ON wompi_payment_ledger(payment_period);

CREATE TABLE IF NOT EXISTS wompi_ledger_adjustments (
  id                TEXT PRIMARY KEY,
  entry_id          TEXT NOT NULL REFERENCES wompi_payment_ledger(id),
  kind              TEXT NOT NULL,
  amount_cents      BIGINT NOT NULL,
  reason            TEXT NOT NULL,
  created_by        TEXT NOT NULL,
  external_reference TEXT,
  created_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK (kind IN ('refund','chargeback','correction'))
);

CREATE INDEX IF NOT EXISTS idx_wompi_ledger_adjustments_entry ON wompi_ledger_adjustments(entry_id);

-- Cross-coach isolation (RLS): the coach is the tenant.
ALTER TABLE wompi_payment_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wompi_ledger_coach_isolation ON wompi_payment_ledger;
CREATE POLICY wompi_ledger_coach_isolation ON wompi_payment_ledger
  USING (coach_id = current_setting('app.current_coach_id', true));

-- Link Wompi transaction id to commission entries (optional, additive).
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS wompi_transaction_id TEXT;
CREATE INDEX IF NOT EXISTS idx_commission_entries_wompi_tx ON commission_entries(wompi_transaction_id);
