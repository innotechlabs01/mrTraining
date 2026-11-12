-- Athlete session event projections (NATS JetStream consumer).
--
-- These tables are the Go API equivalent of the legacy Next.js
-- `apps/web/src/lib/db/migrations/athlete_metrics.sql` tables. They store
-- projections of athlete.session.* events: personal records (PRs), session
-- completion stats and live session progress.
--
-- Each table uses a UUID primary key (per the database design standard) plus
-- a unique constraint on the natural business key so the consumer can upsert
-- idempotently (ON CONFLICT) when NATS redelivers a message.
--
-- `organization_id` provides tenant context for Row-Level Security; the
-- consumer resolves it from the Clerk auth id in each message and sets
-- `app.current_organization_id` before writing.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- athlete_prs — per-athlete per-exercise personal bests.
CREATE TABLE IF NOT EXISTS athlete_prs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_clerk_id TEXT NOT NULL,
    exercise_id     TEXT NOT NULL,
    reps            INTEGER NOT NULL,
    weight          REAL NOT NULL,
    volume          REAL NOT NULL,
    logged_at       TEXT NOT NULL,
    organization_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE athlete_prs ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE athlete_prs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE athlete_prs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_prs_natural_key
    ON athlete_prs (athlete_clerk_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_athlete_prs_org
    ON athlete_prs (organization_id) WHERE organization_id IS NOT NULL;

-- athlete_session_stats — session completion record.
CREATE TABLE IF NOT EXISTS athlete_session_stats (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     TEXT NOT NULL UNIQUE,
    athlete_clerk_id TEXT NOT NULL,
    completed_at   TEXT NOT NULL,
    first_seen_at  TEXT NOT NULL DEFAULT now(),
    organization_id UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE athlete_session_stats ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE athlete_session_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE athlete_session_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_athlete_session_stats_org
    ON athlete_session_stats (organization_id) WHERE organization_id IS NOT NULL;

-- athlete_session_progress — live session volume/duration.
CREATE TABLE IF NOT EXISTS athlete_session_progress (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       TEXT NOT NULL UNIQUE,
    athlete_clerk_id TEXT NOT NULL,
    total_volume     REAL,
    duration_seconds INTEGER,
    updated_at       TEXT NOT NULL,
    organization_id  UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE athlete_session_progress ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE athlete_session_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_athlete_session_progress_org
    ON athlete_session_progress (organization_id) WHERE organization_id IS NOT NULL;

-- Row-Level Security: tenant isolation for these projection tables.
-- PostgreSQL does NOT support "CREATE POLICY IF NOT EXISTS": the policy has to
-- be dropped first. The previous form failed with "syntax error at or near
-- NOT", which broke the migration step of every CI run.
ALTER TABLE athlete_prs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS athlete_prs_tenant_isolation ON athlete_prs;
CREATE POLICY athlete_prs_tenant_isolation ON athlete_prs
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE athlete_session_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS athlete_session_stats_tenant_isolation ON athlete_session_stats;
CREATE POLICY athlete_session_stats_tenant_isolation ON athlete_session_stats
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE athlete_session_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS athlete_session_progress_tenant_isolation ON athlete_session_progress;
CREATE POLICY athlete_session_progress_tenant_isolation ON athlete_session_progress
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
