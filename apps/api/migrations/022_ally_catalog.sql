-- Ally catalog (comercios y servicios de aliados), Phase C.
-- ally_products / ally_services: public offerings of an ally. Money is stored
-- as INTEGER cents (`price_cents`) per rules 04-database-design.md §1.8; no
-- float is used for currency. MVP currency is COP only (CHECK constraint).
-- Ownership: every row references an `allies` row; application layer scopes
-- access to the ally the authenticated user owns or belongs to (ally_members).
-- Additive only: references existing `allies` table (created in 019_allies.sql).
-- No operations, reservations, redemptions, payment declarations or commissions
-- are created here (those belong to phases D–G).

CREATE TABLE IF NOT EXISTS ally_products (
  id          TEXT PRIMARY KEY,
  ally_id     TEXT NOT NULL REFERENCES allies(id),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'COP',
  stock       INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (price_cents >= 0),
  CHECK (stock >= 0),
  CHECK (currency IN ('COP')),
  CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS ally_services (
  id          TEXT PRIMARY KEY,
  ally_id     TEXT NOT NULL REFERENCES allies(id),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'COP',
  duration_min INTEGER NOT NULL DEFAULT 0,
  capacity    INTEGER NOT NULL DEFAULT 1,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (price_cents >= 0),
  CHECK (duration_min >= 0),
  CHECK (capacity >= 1),
  CHECK (currency IN ('COP')),
  CHECK (active IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_ally_products_ally ON ally_products(ally_id);
CREATE INDEX IF NOT EXISTS idx_ally_products_active ON ally_products(ally_id, active);
CREATE INDEX IF NOT EXISTS idx_ally_services_ally ON ally_services(ally_id);
CREATE INDEX IF NOT EXISTS idx_ally_services_active ON ally_services(ally_id, active);
