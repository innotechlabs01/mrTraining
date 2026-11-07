-- 400_subscriptions.sql
-- Subscriptions: an athlete's recurring subscription to a coach's plan.
-- This is the PostgreSQL counterpart of the subscription aggregate. The
-- aggregate root is the Subscription; all mutations go through its methods
-- which enforce invariants and use the version column for optimistic
-- concurrency control.
CREATE TABLE IF NOT EXISTS subscriptions (
    id                 TEXT PRIMARY KEY,
    athlete_id         TEXT NOT NULL,
    coach_id           TEXT NOT NULL,
    plan_id            TEXT NOT NULL,
    plan_name          TEXT NOT NULL,
    plan_price         REAL NOT NULL,
    currency           TEXT NOT NULL DEFAULT 'COP',
    billing_period     TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    status             TEXT NOT NULL CHECK (status IN ('active', 'trial', 'past_due', 'cancelled', 'expired')),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at        TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    grace_period_days  INTEGER NOT NULL DEFAULT 5,
    payment_due_date   TIMESTAMPTZ NOT NULL,
    version            INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_athlete ON subscriptions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_coach ON subscriptions(coach_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_athlete_status ON subscriptions(athlete_id, status);
