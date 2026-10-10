-- Coach plans with pricing, currency, discount, and TRM snapshot.
-- Each plan belongs to a coach. isActive=1 means published on the coach's
-- public landing; isActive=0 means draft (hidden). Currency is COP or USD;
-- TRM is stored as a snapshot at save time so conversion references stay stable.

CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'COP',
    billing_period TEXT NOT NULL DEFAULT 'monthly',
    max_athletes INTEGER NOT NULL DEFAULT 10,
    max_sessions_per_week INTEGER NOT NULL DEFAULT 12,
    is_active INTEGER NOT NULL DEFAULT 0,
    athlete_count INTEGER NOT NULL DEFAULT 0,
    coach_id TEXT NOT NULL,
    trm REAL NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT '',
    discount_value REAL NOT NULL DEFAULT 0,
    discount_label TEXT NOT NULL DEFAULT '',
    discount_valid_from TEXT NOT NULL DEFAULT '',
    discount_valid_until TEXT NOT NULL DEFAULT '',
    discount_code TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plans_coach ON plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_plans_coach_active ON plans(coach_id, is_active);
