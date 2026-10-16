-- Commission agreements (versioned), Phase B.
-- Only the agreement definition lives here in Phase B; commission_entries and
-- financial_adjustments are added later (Phase E) in their own migration.
-- Rates are stored in basis points (`rate_bps`, 1000 = 10.00%) and fixed
-- amounts in integer cents, so no binary floating point is used.

CREATE TABLE IF NOT EXISTS commission_agreements (
  id                 TEXT PRIMARY KEY,
  relationship_id    TEXT NOT NULL REFERENCES coach_ally_relationships(id),
  version            INTEGER NOT NULL,
  rate_bps           INTEGER NOT NULL DEFAULT 0,
  fixed_amount_cents INTEGER NOT NULL DEFAULT 0,
  eligible_base_rule TEXT NOT NULL DEFAULT 'gross_minus_discount_minus_tax',
  rounding           TEXT NOT NULL DEFAULT 'half_up',
  currency           TEXT NOT NULL DEFAULT 'COP',
  valid_from         TEXT NOT NULL,
  valid_to           TEXT,
  status             TEXT NOT NULL DEFAULT 'proposed',
  accepted_by        TEXT,
  accepted_at        TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (relationship_id, version),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (fixed_amount_cents >= 0),
  CHECK (status IN ('proposed','accepted','superseded','ended')),
  -- Interval sanity: a closed agreement can never end before it starts. This is
  -- the database-level backstop against inverted intervals under concurrency.
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- At most one *open* (current) agreement per relationship. Historical intervals
-- never overlap because accepting a new agreement closes the previous one in the
-- same transaction (service-level interval validation, H-02).
CREATE UNIQUE INDEX IF NOT EXISTS uq_agreement_open
  ON commission_agreements(relationship_id)
  WHERE valid_to IS NULL;
