-- Membership tables
CREATE TABLE IF NOT EXISTS athlete_memberships (
    id TEXT PRIMARY KEY,
    athlete_id TEXT NOT NULL,
    coach_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    plan_price REAL NOT NULL,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    status TEXT NOT NULL CHECK (status IN ('active', 'trial', 'past_due', 'cancelled', 'expired')),
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    grace_period_days INTEGER NOT NULL DEFAULT 5,
    payment_due_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_athlete_memberships_athlete_id ON athlete_memberships(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_memberships_coach_id ON athlete_memberships(coach_id);
CREATE INDEX IF NOT EXISTS idx_athlete_memberships_status ON athlete_memberships(status);

CREATE TABLE IF NOT EXISTS membership_payments (
    id TEXT PRIMARY KEY,
    membership_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    polar_order_id TEXT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (membership_id) REFERENCES athlete_memberships(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_membership_id ON membership_payments(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_payments_polar_order_id ON membership_payments(polar_order_id);