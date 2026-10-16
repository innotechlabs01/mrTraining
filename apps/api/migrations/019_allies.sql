-- Allies (Alianzas) — commercial ally network, Phase B.
-- Adds: ally business profile, locations, members, coach-ally relationships and
-- invitations. Money is stored as INTEGER cents (`_cents`) per rules
-- 04-database-design.md §1.8; user-linked ids are Clerk subject ids.
-- Invitations are single-use (token stored only as SHA-256 hash) and carry an
-- explicit `role_sync_status` so the ally role assignment (external Clerk call)
-- stays recoverable/idempotent.

CREATE TABLE IF NOT EXISTS allies (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT,
  legal_name      TEXT NOT NULL,
  commercial_name TEXT NOT NULL,
  category        TEXT NOT NULL,
  contact_email   TEXT DEFAULT '',
  contact_phone   TEXT DEFAULT '',
  tax_id          TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (status IN ('pending','active','suspended')),
  CHECK (category IN ('gym','nutrition','physio','supplements','recovery','other'))
);

CREATE TABLE IF NOT EXISTS ally_locations (
  id         TEXT PRIMARY KEY,
  ally_id    TEXT NOT NULL REFERENCES allies(id),
  name       TEXT NOT NULL DEFAULT '',
  address    TEXT DEFAULT '',
  lat        REAL DEFAULT 0,
  lng        REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ally_members (
  id         TEXT PRIMARY KEY,
  ally_id    TEXT NOT NULL REFERENCES allies(id),
  user_id    TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ally_id, user_id),
  CHECK (role IN ('owner','staff'))
);

CREATE TABLE IF NOT EXISTS coach_ally_relationships (
  id           TEXT PRIMARY KEY,
  coach_id     TEXT NOT NULL,
  ally_id      TEXT NOT NULL REFERENCES allies(id),
  status       TEXT NOT NULL DEFAULT 'invited',
  attributed_by TEXT,
  invited_at   TEXT,
  activated_at TEXT,
  ended_at     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (coach_id, ally_id),
  CHECK (status IN ('invited','active','declined','suspended'))
);

CREATE TABLE IF NOT EXISTS ally_invitations (
  id               TEXT PRIMARY KEY,
  relationship_id  TEXT NOT NULL REFERENCES coach_ally_relationships(id),
  token_hash       TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  -- Explicit states for the external Clerk role assignment (H-01, recoverable):
  role_sync_status TEXT NOT NULL DEFAULT 'pending',
  expires_at       TEXT NOT NULL,
  accepted_at      TEXT,
  accepted_user_id TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (token_hash),
  CHECK (status IN ('pending','accepted','expired','revoked')),
  CHECK (role_sync_status IN ('pending','synced','failed'))
);

CREATE INDEX IF NOT EXISTS idx_allies_owner_user ON allies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_allies_status ON allies(status);
CREATE INDEX IF NOT EXISTS idx_ally_locations_ally ON ally_locations(ally_id);
CREATE INDEX IF NOT EXISTS idx_ally_members_ally ON ally_members(ally_id);
CREATE INDEX IF NOT EXISTS idx_ally_members_user ON ally_members(user_id);
CREATE INDEX IF NOT EXISTS idx_car_coach ON coach_ally_relationships(coach_id);
CREATE INDEX IF NOT EXISTS idx_car_ally ON coach_ally_relationships(ally_id);
CREATE INDEX IF NOT EXISTS idx_ally_invitations_relationship ON ally_invitations(relationship_id);
