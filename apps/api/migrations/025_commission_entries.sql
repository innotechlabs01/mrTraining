-- Commission entries and financial adjustments (Phase E).
-- commission_entries: una entrada de comisión por operación, calculada a partir
-- del acuerdo vigente y la declaración de pago elegible. Snapshot inmutable de
-- los valores de cálculo (agreement_id, version, base_cents, rate_bps,
-- fixed_amount_cents, amount_cents). Nunca se recalcula históricamente.
-- financial_adjustments: asientos compensatorios (refund/chargeback/correction)
-- que preservan el registro original.
-- Additive only: referencia `ally_operations`, `commission_agreements` (creada
-- en 020_commissions.sql). `settlement_id` es TEXT sin FK porque `coach_settlements`
-- se crea en Fase F.

CREATE TABLE IF NOT EXISTS commission_entries (
  id                 TEXT PRIMARY KEY,
  operation_id       TEXT NOT NULL REFERENCES ally_operations(id),
  relationship_id    TEXT NOT NULL,
  coach_id           TEXT NOT NULL,
  agreement_id       TEXT NOT NULL REFERENCES commission_agreements(id),
  agreement_version  INTEGER NOT NULL,
  base_cents         INTEGER NOT NULL,
  rate_bps           INTEGER NOT NULL,
  fixed_amount_cents INTEGER NOT NULL,
  amount_cents       INTEGER NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'COP',
  status             TEXT NOT NULL DEFAULT 'accrued', -- accrued|reversed
  computed_at        TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (operation_id),
  CHECK (base_cents >= 0),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (fixed_amount_cents >= 0),
  CHECK (amount_cents >= 0),
  CHECK (currency IN ('COP')),
  CHECK (status IN ('accrued','reversed'))
);

CREATE TABLE IF NOT EXISTS financial_adjustments (
  id           TEXT PRIMARY KEY,
  entry_id     TEXT REFERENCES commission_entries(id),
  settlement_id TEXT,                       -- sin FK: coach_settlements se crea en Fase F
  kind         TEXT NOT NULL,               -- refund|chargeback|correction
  amount_cents INTEGER NOT NULL,            -- signo negativo = reverso
  reason       TEXT NOT NULL,
  created_by   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (kind IN ('refund','chargeback','correction'))
);

CREATE INDEX IF NOT EXISTS idx_commission_entries_operation
  ON commission_entries(operation_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_relationship
  ON commission_entries(relationship_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_coach
  ON commission_entries(coach_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_status
  ON commission_entries(status);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_entry
  ON financial_adjustments(entry_id);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_kind
  ON financial_adjustments(kind);
