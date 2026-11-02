-- ============================================================================
-- 300_remaining_migrations.sql
-- Consolidated remaining migrations from SQLite originals (010-031 API, 003-025 web)
-- Converted to PostgreSQL. Applied with IF NOT EXISTS for idempotency.
-- ============================================================================

-- 010_challenge_exercises (API) -> challenge_exercises already created in 108_video_challenges.sql
-- (Referenced from challenges table. Skipping duplicate.)

-- 011_exercise_library (web)
CREATE TABLE IF NOT EXISTS exercise_library (
    id             TEXT PRIMARY KEY,
    slug           TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    mode           TEXT NOT NULL DEFAULT 'reps',
    body_part      TEXT,
    muscle_groups  TEXT NOT NULL DEFAULT '',
    secondary_muscles TEXT NOT NULL DEFAULT '',
    equipment      TEXT,
    difficulty     TEXT,
    category       TEXT,
    instructions   TEXT NOT NULL DEFAULT '',
    default_sec    INTEGER,
    is_custom      INTEGER NOT NULL DEFAULT 0,
    coach_id       TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_coach ON exercise_library(coach_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_name ON exercise_library(name);

-- 013_health_metrics (web)
CREATE TABLE IF NOT EXISTS athlete_health_devices (
    id             TEXT PRIMARY KEY,
    athlete_id     TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    platform       TEXT NOT NULL,
    device_name    TEXT NOT NULL DEFAULT '',
    device_brand   TEXT NOT NULL DEFAULT '',
    is_active      INTEGER NOT NULL DEFAULT 1,
    access_token   TEXT,
    refresh_token  TEXT,
    token_expires_at TEXT,
    last_sync_at   TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(athlete_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_health_devices_athlete ON athlete_health_devices(athlete_id);

CREATE TABLE IF NOT EXISTS athlete_health_metrics (
    id                TEXT PRIMARY KEY,
    athlete_id        TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    metric_type       TEXT NOT NULL,
    value             REAL NOT NULL,
    unit              TEXT NOT NULL,
    source            TEXT NOT NULL,
    source_workout_id TEXT,
    recorded_at       TEXT NOT NULL,
    synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_health_metrics_dedupe ON athlete_health_metrics(athlete_id, metric_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_health_metrics_athlete_time ON athlete_health_metrics(athlete_id, metric_type, recorded_at DESC);

CREATE TABLE IF NOT EXISTS athlete_sleep_logs (
    id            TEXT PRIMARY KEY,
    athlete_id    TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    date          TEXT NOT NULL,
    total_minutes INTEGER NOT NULL,
    deep_minutes  INTEGER,
    rem_minutes   INTEGER,
    light_minutes INTEGER,
    awake_minutes INTEGER,
    efficiency    REAL,
    score         REAL,
    source        TEXT NOT NULL,
    recorded_at   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sleep_dedupe ON athlete_sleep_logs(athlete_id, date, source);
CREATE INDEX IF NOT EXISTS idx_sleep_athlete_date ON athlete_sleep_logs(athlete_id, date DESC);

-- 016_athlete_favorites (API)
CREATE TABLE IF NOT EXISTS athlete_favorites (
    id           TEXT PRIMARY KEY,
    athlete_id   TEXT NOT NULL,
    item_type    TEXT NOT NULL,
    item_id      TEXT NOT NULL,
    item_title   TEXT NOT NULL DEFAULT '',
    item_meta    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_favorites_athlete ON athlete_favorites(athlete_id);

-- 017_store_purchases (API)
CREATE TABLE IF NOT EXISTS store_purchases (
    id           TEXT PRIMARY KEY,
    athlete_id   TEXT NOT NULL,
    product_id   TEXT NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 1,
    price        REAL NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_purchases_athlete ON store_purchases(athlete_id);
CREATE INDEX IF NOT EXISTS idx_store_purchases_product ON store_purchases(product_id);

-- 018_store_orders (API)
CREATE TABLE IF NOT EXISTS store_orders (
    id            TEXT PRIMARY KEY,
    coach_id      TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    total         REAL NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_orders_coach ON store_orders(coach_id);

CREATE TABLE IF NOT EXISTS store_order_items (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
    product_id  TEXT NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    price       REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);

-- 019_allies (API)
CREATE TABLE IF NOT EXISTS allies (
    id             TEXT PRIMARY KEY,
    owner_user_id  TEXT NOT NULL,
    legal_name     TEXT NOT NULL,
    commercial_name TEXT NOT NULL,
    category       TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'active',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_allies_owner ON allies(owner_user_id);

-- 020_commissions (API)
CREATE TABLE IF NOT EXISTS commission_agreements (
    id                TEXT PRIMARY KEY,
    coach_id          TEXT NOT NULL,
    ally_id           TEXT NOT NULL,
    rate_bps          INTEGER NOT NULL,
    fixed_amount_cents INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 021_financial_audit (API)
CREATE TABLE IF NOT EXISTS financial_audit (
    id        TEXT PRIMARY KEY,
    actor_id  TEXT NOT NULL,
    action    TEXT NOT NULL,
    table_name TEXT NOT NULL,
    row_id    TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 022_ally_catalog (API)
CREATE TABLE IF NOT EXISTS ally_products (
    id          TEXT PRIMARY KEY,
    ally_id     TEXT NOT NULL REFERENCES allies(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'COP',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 023_ally_commerce (API)
CREATE TABLE IF NOT EXISTS ally_operations (
    id          TEXT PRIMARY KEY,
    ally_id     TEXT NOT NULL REFERENCES allies(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 024_ally_payment_declarations (API)
CREATE TABLE IF NOT EXISTS ally_payment_declarations (
    id             TEXT PRIMARY KEY,
    ally_id        TEXT NOT NULL REFERENCES allies(id) ON DELETE CASCADE,
    amount_cents   INTEGER NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'COP',
    declared_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    supersedes_id  TEXT
);

-- 025_commission_entries (API)
CREATE TABLE IF NOT EXISTS commission_entries (
    id                   TEXT PRIMARY KEY,
    agreement_id         TEXT NOT NULL,
    version              INTEGER NOT NULL,
    base_cents           INTEGER NOT NULL,
    rate_bps             INTEGER NOT NULL,
    fixed_amount_cents   INTEGER NOT NULL DEFAULT 0,
    amount_cents         INTEGER NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 026_settlements (API)
CREATE TABLE IF NOT EXISTS coach_settlements (
    id          TEXT PRIMARY KEY,
    coach_id    TEXT NOT NULL,
    ally_id     TEXT NOT NULL REFERENCES allies(id) ON DELETE CASCADE,
    period      TEXT NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'COP',
    amount_cents INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 028_wearable_oauth_tokens (API)
CREATE TABLE IF NOT EXISTS wearable_oauth_tokens (
    id      TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    access_token  TEXT NOT NULL,
    refresh_token TEXT,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 029_readiness_checkins (API)
CREATE TABLE IF NOT EXISTS readiness_checkins (
    id          TEXT PRIMARY KEY,
    athlete_id  TEXT NOT NULL,
    score       INTEGER NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 030_workout_exercises_gps_intervals (API) - ALTER TABLE on existing tables
-- workout_template_exercises: add gps_route, intervals (already created in 109)
-- workout_exercises: add gps_route, intervals, actual_gps_route, actual_intervals
-- These columns may not exist yet since workout_exercises is from web 007 (not yet applied)
-- We'll add them when workout_exercises is created, or via ALTER if it exists.

-- 007_workout_templates (web) - workout_exercises, workout_session_logs, workout_set_logs
CREATE TABLE IF NOT EXISTS workout_exercises (
    id                TEXT PRIMARY KEY,
    workout_id        TEXT NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    sets              INTEGER NOT NULL,
    reps              INTEGER NOT NULL,
    weight_kg         REAL,
    rest_seconds      INTEGER,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    notes             TEXT,
    mode              TEXT NOT NULL DEFAULT 'reps',
    phase             TEXT NOT NULL DEFAULT 'work',
    superset_group    TEXT,
    reps_min          INTEGER,
    reps_max          INTEGER,
    prog              TEXT,
    inc               REAL,
    sec               INTEGER,
    minutes           REAL,
    speed             REAL,
    per_side          INTEGER NOT NULL DEFAULT 0,
    body_part         TEXT,
    muscle_groups     TEXT NOT NULL DEFAULT '',
    library_exercise_id TEXT,
    gps_route         TEXT,
    intervals         TEXT,
    actual_gps_route  TEXT,
    actual_intervals  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);

CREATE TABLE IF NOT EXISTS workout_session_logs (
    id                 TEXT PRIMARY KEY,
    workout_id         TEXT NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
    athlete_id         TEXT NOT NULL,
    started_at         TEXT NOT NULL,
    completed          INTEGER NOT NULL DEFAULT 0,
    completed_at       TEXT,
    current_exercise_index INTEGER NOT NULL DEFAULT 0,
    duration_seconds   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_workout_session_athlete ON workout_session_logs(athlete_id, workout_id);

CREATE TABLE IF NOT EXISTS workout_set_logs (
    id           TEXT PRIMARY KEY,
    session_id   TEXT NOT NULL REFERENCES workout_session_logs(id) ON DELETE CASCADE,
    exercise_id  TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_index    INTEGER NOT NULL,
    weight_kg    REAL,
    reps         REAL,
    completed    INTEGER NOT NULL DEFAULT 0,
    logged_at    TEXT NOT NULL,
    phase        TEXT NOT NULL DEFAULT 'work',
    rir          REAL,
    rpe          REAL,
    sec          INTEGER,
    minutes      REAL,
    speed        REAL,
    skipped      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_set_log_session ON workout_set_logs(session_id);

-- 024_assigned_workout_exercises (web)
CREATE TABLE IF NOT EXISTS assigned_workout_exercises (
    id               TEXT PRIMARY KEY,
    workout_id       TEXT NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    sets             INTEGER NOT NULL,
    reps             INTEGER NOT NULL,
    weight_kg        REAL,
    rest_seconds     INTEGER,
    notes            TEXT,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    muscle_groups    TEXT NOT NULL DEFAULT '[]',
    library_exercise_id TEXT,
    mode             TEXT NOT NULL DEFAULT 'reps',
    phase            TEXT NOT NULL DEFAULT 'work',
    superset_group   TEXT,
    reps_min         INTEGER,
    reps_max         INTEGER,
    prog             TEXT,
    inc              REAL,
    sec              INTEGER,
    minutes          REAL,
    speed            REAL,
    per_side         INTEGER NOT NULL DEFAULT 0,
    body_part        TEXT
);
CREATE INDEX IF NOT EXISTS idx_assigned_workout_exercises_workout ON assigned_workout_exercises(workout_id);

-- 017_push_tokens (web)
CREATE TABLE IF NOT EXISTS push_tokens (
    id      TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token   TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'expo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 023_form_metrics (web)
CREATE TABLE IF NOT EXISTS form_metrics (
    id          TEXT PRIMARY KEY,
    athlete_id  TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    workout_id  TEXT,
    form_score  REAL NOT NULL,
    form_metrics TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 018_community_notifications_favorites (web) - community_forums
CREATE TABLE IF NOT EXISTS community_forums (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 006_blog_schema (web) - blog_posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id           TEXT PRIMARY KEY,
    coach_id     TEXT NOT NULL,
    title        TEXT NOT NULL,
    slug         TEXT NOT NULL UNIQUE,
    content      TEXT NOT NULL,
    excerpt      TEXT,
    cover_image_url TEXT,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
