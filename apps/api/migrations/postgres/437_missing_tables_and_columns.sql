-- 437_missing_tables_and_columns.sql
-- T-026: Create missing PostgreSQL tables and add missing columns queried by Go repositories.
-- Includes RLS policies and grants to mr_training_app.

-- ============================================================================
-- 1. Missing Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.landing_content (
    version    INTEGER PRIMARY KEY,
    content    TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.athlete_alerts (
    id           TEXT PRIMARY KEY,
    athlete_id   TEXT NOT NULL,
    type         TEXT NOT NULL,
    severity     TEXT NOT NULL DEFAULT 'info',
    title        TEXT NOT NULL,
    message      TEXT NOT NULL,
    is_read      BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dismissed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_athlete_alerts_athlete_created
    ON public.athlete_alerts(athlete_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.athlete_onboarding (
    athlete_id               TEXT PRIMARY KEY,
    sports                   TEXT NOT NULL DEFAULT '[]',
    modality                 TEXT NOT NULL DEFAULT '',
    experience_level         TEXT NOT NULL DEFAULT '',
    goal                     TEXT NOT NULL DEFAULT '',
    sessions_per_week        INTEGER NOT NULL DEFAULT 0,
    session_duration         INTEGER NOT NULL DEFAULT 0,
    equipment                TEXT NOT NULL DEFAULT '',
    athlete_routine_accepted BOOLEAN NOT NULL DEFAULT false,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.athlete_routines (
    id           TEXT PRIMARY KEY,
    athlete_id   TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    exercises    TEXT NOT NULL DEFAULT '[]',
    duration_min INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_athlete_routines_athlete_created
    ON public.athlete_routines(athlete_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.coach_time_blocks (
    id         TEXT PRIMARY KEY,
    coach_id   TEXT NOT NULL,
    title      TEXT NOT NULL,
    block_type TEXT NOT NULL DEFAULT '',
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    recurrence TEXT,
    color      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coach_time_blocks_coach
    ON public.coach_time_blocks(coach_id);

CREATE TABLE IF NOT EXISTS public.community_challenges (
    id                 TEXT PRIMARY KEY,
    title              TEXT NOT NULL,
    description        TEXT,
    duration_minutes   INTEGER NOT NULL DEFAULT 0,
    calories           INTEGER NOT NULL DEFAULT 0,
    participants_count INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_posts (
    id         TEXT PRIMARY KEY,
    author_id  TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_posts_author
    ON public.community_posts(author_id);

CREATE TABLE IF NOT EXISTS public.community_messages (
    id         TEXT PRIMARY KEY,
    forum_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    user_name  TEXT,
    message    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_messages_forum_created
    ON public.community_messages(forum_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.import_jobs (
    id                 TEXT PRIMARY KEY,
    athlete_id         TEXT NOT NULL,
    source             TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending',
    workouts_imported  INTEGER NOT NULL DEFAULT 0,
    exercises_imported INTEGER NOT NULL DEFAULT 0,
    error_message      TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_import_jobs_athlete_created
    ON public.import_jobs(athlete_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.video_views (
    id                     TEXT PRIMARY KEY,
    athlete_id             TEXT NOT NULL,
    exercise_id            TEXT NOT NULL,
    action                 TEXT NOT NULL,
    progress_pct           INTEGER,
    watch_duration_seconds INTEGER,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_views_athlete_created
    ON public.video_views(athlete_id, created_at DESC);

-- ============================================================================
-- 2. RLS & Grants for New Tables
-- ============================================================================

ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_landing_content_read ON public.landing_content;
CREATE POLICY policy_landing_content_read ON public.landing_content
    FOR SELECT USING (true);
DROP POLICY IF EXISTS policy_landing_content_write ON public.landing_content;
CREATE POLICY policy_landing_content_write ON public.landing_content
    FOR ALL
    USING (NULLIF(current_setting('app.current_role', true)::text, '') IN ('coach', 'admin', 'super_admin', 'system_worker'))
    WITH CHECK (NULLIF(current_setting('app.current_role', true)::text, '') IN ('coach', 'admin', 'super_admin', 'system_worker'));

ALTER TABLE public.athlete_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_athlete_alerts_owner_or_admin ON public.athlete_alerts;
CREATE POLICY policy_athlete_alerts_owner_or_admin ON public.athlete_alerts
    FOR ALL
    USING (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR EXISTS (
            SELECT 1 FROM public.coach_athlete_links cal
            WHERE cal.athlete_id = athlete_alerts.athlete_id
              AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
              AND cal.status = 'active'
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR EXISTS (
            SELECT 1 FROM public.coach_athlete_links cal
            WHERE cal.athlete_id = athlete_alerts.athlete_id
              AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
              AND cal.status = 'active'
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

ALTER TABLE public.athlete_onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_athlete_onboarding_owner_or_admin ON public.athlete_onboarding;
CREATE POLICY policy_athlete_onboarding_owner_or_admin ON public.athlete_onboarding
    FOR ALL
    USING (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR EXISTS (
            SELECT 1 FROM public.coach_athlete_links cal
            WHERE cal.athlete_id = athlete_onboarding.athlete_id
              AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
              AND cal.status = 'active'
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR EXISTS (
            SELECT 1 FROM public.coach_athlete_links cal
            WHERE cal.athlete_id = athlete_onboarding.athlete_id
              AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
              AND cal.status = 'active'
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

ALTER TABLE public.athlete_routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_athlete_routines_owner_or_admin ON public.athlete_routines;
CREATE POLICY policy_athlete_routines_owner_or_admin ON public.athlete_routines
    FOR ALL
    USING (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR EXISTS (
            SELECT 1 FROM public.coach_athlete_links cal
            WHERE cal.athlete_id = athlete_routines.athlete_id
              AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
              AND cal.status = 'active'
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR EXISTS (
            SELECT 1 FROM public.coach_athlete_links cal
            WHERE cal.athlete_id = athlete_routines.athlete_id
              AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
              AND cal.status = 'active'
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

ALTER TABLE public.coach_time_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_coach_time_blocks_owner_or_admin ON public.coach_time_blocks;
CREATE POLICY policy_coach_time_blocks_owner_or_admin ON public.coach_time_blocks
    FOR ALL
    USING (
        coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
        OR coach_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
        OR coach_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_community_challenges_read ON public.community_challenges;
CREATE POLICY policy_community_challenges_read ON public.community_challenges
    FOR SELECT USING (true);
DROP POLICY IF EXISTS policy_community_challenges_write ON public.community_challenges;
CREATE POLICY policy_community_challenges_write ON public.community_challenges
    FOR ALL
    USING (NULLIF(current_setting('app.current_role', true)::text, '') IN ('coach', 'admin', 'super_admin', 'system_worker'))
    WITH CHECK (NULLIF(current_setting('app.current_role', true)::text, '') IN ('coach', 'admin', 'super_admin', 'system_worker'));

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_community_posts_read ON public.community_posts;
CREATE POLICY policy_community_posts_read ON public.community_posts
    FOR SELECT USING (true);
DROP POLICY IF EXISTS policy_community_posts_write ON public.community_posts;
CREATE POLICY policy_community_posts_write ON public.community_posts
    FOR ALL
    USING (
        author_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        author_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_community_messages_read ON public.community_messages;
CREATE POLICY policy_community_messages_read ON public.community_messages
    FOR SELECT USING (true);
DROP POLICY IF EXISTS policy_community_messages_write ON public.community_messages;
CREATE POLICY policy_community_messages_write ON public.community_messages
    FOR ALL
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_import_jobs_owner_or_admin ON public.import_jobs;
CREATE POLICY policy_import_jobs_owner_or_admin ON public.import_jobs
    FOR ALL
    USING (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_video_views_owner_or_admin ON public.video_views;
CREATE POLICY policy_video_views_owner_or_admin ON public.video_views
    FOR ALL
    USING (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR EXISTS (
            SELECT 1 FROM public.coach_athlete_links cal
            WHERE cal.athlete_id = video_views.athlete_id
              AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
              AND cal.status = 'active'
        )
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    )
    WITH CHECK (
        athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')
        OR NULLIF(current_setting('app.current_role', true)::text, '') IN ('admin', 'super_admin', 'system_worker')
    );

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.landing_content TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.athlete_alerts TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.athlete_onboarding TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.athlete_routines TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coach_time_blocks TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_challenges TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_posts TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_messages TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.import_jobs TO mr_training_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.video_views TO mr_training_app;
    END IF;
END $$;

-- ============================================================================
-- 3. Missing Columns on Existing Tables
-- ============================================================================

-- readiness_checkins
ALTER TABLE public.readiness_checkins ADD COLUMN IF NOT EXISTS date TEXT NOT NULL DEFAULT '';
ALTER TABLE public.readiness_checkins ADD COLUMN IF NOT EXISTS readiness INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.readiness_checkins ADD COLUMN IF NOT EXISTS sleep_hours REAL;
ALTER TABLE public.readiness_checkins ADD COLUMN IF NOT EXISTS soreness INTEGER;
ALTER TABLE public.readiness_checkins ALTER COLUMN score SET DEFAULT 0;
UPDATE public.readiness_checkins
    SET date = COALESCE(NULLIF(date, ''), TO_CHAR(created_at, 'YYYY-MM-DD') || '-' || id)
    WHERE date = '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_readiness_checkins_athlete_date
    ON public.readiness_checkins(athlete_id, date);

-- support_tickets & ticket_messages
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS athlete_id TEXT DEFAULT '';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT '';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS author_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- form_metrics
ALTER TABLE public.form_metrics ADD COLUMN IF NOT EXISTS exercise_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.form_metrics ADD COLUMN IF NOT EXISTS depth REAL NOT NULL DEFAULT 0;
ALTER TABLE public.form_metrics ADD COLUMN IF NOT EXISTS alignment REAL NOT NULL DEFAULT 0;
ALTER TABLE public.form_metrics ADD COLUMN IF NOT EXISTS tempo REAL NOT NULL DEFAULT 0;
ALTER TABLE public.form_metrics ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- exercise_library
ALTER TABLE public.exercise_library ADD COLUMN IF NOT EXISTS video_url TEXT;

-- message_threads & messages
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS athlete_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS athlete_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS last_message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS last_sent_at TEXT NOT NULL DEFAULT '';
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT NOT NULL DEFAULT '';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.messages ALTER COLUMN sender_name SET DEFAULT '';

-- products, store_orders, store_order_items
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_shop INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS athlete_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'COP';
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS external_ref TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ALTER COLUMN coach_id SET DEFAULT '';

ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS unit_price REAL NOT NULL DEFAULT 0;
ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS fulfilled INTEGER NOT NULL DEFAULT 0;

-- workout_templates & workout_template_exercises
ALTER TABLE public.workout_templates ADD COLUMN IF NOT EXISTS goal TEXT NOT NULL DEFAULT '';
ALTER TABLE public.workout_templates ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS reps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS weight_kg REAL;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'reps';
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'work';
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS superset_group TEXT;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS prog TEXT;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS inc REAL;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS sec INTEGER;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS minutes REAL;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS speed REAL;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS per_side INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS body_part TEXT;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS muscle_groups TEXT;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS library_exercise_id TEXT;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS gps_route TEXT;
ALTER TABLE public.workout_template_exercises ADD COLUMN IF NOT EXISTS intervals TEXT;
ALTER TABLE public.workout_template_exercises ALTER COLUMN exercise_id SET DEFAULT '';

-- public_page_config
ALTER TABLE public.public_page_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- allies, ally_products, ally_operations, ally_payment_declarations, commission_entries, coach_settlements, settlement_documents
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '';
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS tax_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.ally_products ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_products ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.ally_products ADD COLUMN IF NOT EXISTS active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.ally_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS relationship_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS athlete_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'created';
ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS scheduled_at TEXT;
ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS confirmed_at TEXT;
ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS completed_at TEXT;
ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS cancelled_at TEXT;
ALTER TABLE public.ally_operations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.ally_operations ALTER COLUMN type SET DEFAULT '';

ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS operation_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS reference TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS evidence_ref TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'declared';
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS reviewed_at TEXT;
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE public.ally_payment_declarations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.ally_payment_declarations ALTER COLUMN ally_id DROP NOT NULL;

ALTER TABLE public.commission_entries ADD COLUMN IF NOT EXISTS agreement_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.commission_entries ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'COP';
ALTER TABLE public.commission_entries ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accrued';
ALTER TABLE public.commission_entries ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.commission_entries ALTER COLUMN version SET DEFAULT 1;

ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS period_start TEXT NOT NULL DEFAULT '';
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS period_end TEXT NOT NULL DEFAULT '';
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS period_key TEXT NOT NULL DEFAULT '';
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS operations_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS base_total_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS commission_gross_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS adjustments_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS commission_net_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS calculated_at TEXT;
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS approved_at TEXT;
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS closed_at TEXT;
ALTER TABLE public.coach_settlements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.coach_settlements ALTER COLUMN period SET DEFAULT '';

ALTER TABLE public.settlement_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
