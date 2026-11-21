-- 433_challenges_gamification_scheduling_and_blog_schema.sql
-- Unifica esquema y políticas RLS para:
--   1. Blog (category, tags, image_url, is_published, blog_post_meta, lectura pública de publicados).
--   2. Agendamiento / Onboarding + WebRTC Meet (coach_availability, coach_appointments con meet_room_id).
--   3. Desafíos "Prueba de Fuego" e insignias/incentivos (challenges extras + RLS atleta vinculado).
--   4. Permisos DML completos para el rol de aplicación mr_training_app.

BEGIN;

-- ============================================================
-- 1. BLOG POSTS & META
-- ============================================================
ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_published INTEGER NOT NULL DEFAULT 0;

UPDATE public.blog_posts
SET image_url = COALESCE(NULLIF(image_url, ''), COALESCE(cover_image_url, ''))
WHERE COALESCE(image_url, '') = '' AND COALESCE(cover_image_url, '') <> '';

UPDATE public.blog_posts
SET is_published = 1
WHERE published_at IS NOT NULL AND COALESCE(is_published, 0) = 0;

CREATE TABLE IF NOT EXISTS public.blog_post_meta (
    post_id           TEXT PRIMARY KEY REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    read_time_minutes INTEGER NOT NULL DEFAULT 5,
    views             INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
    ON public.blog_posts (is_published, published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blog_posts_tenant_isolation_sel ON public.blog_posts;
CREATE POLICY blog_posts_tenant_isolation_sel ON public.blog_posts FOR SELECT
USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR COALESCE(is_published, 0) = 1
);

ALTER TABLE public.blog_post_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_blog_post_meta_sel ON public.blog_post_meta;
CREATE POLICY policy_blog_post_meta_sel ON public.blog_post_meta FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_post_meta.post_id
          AND (
              bp.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
              OR COALESCE(bp.is_published, 0) = 1
          )
    )
);

DROP POLICY IF EXISTS policy_blog_post_meta_ins ON public.blog_post_meta;
CREATE POLICY policy_blog_post_meta_ins ON public.blog_post_meta FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_post_meta.post_id
          AND bp.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
);

DROP POLICY IF EXISTS policy_blog_post_meta_upd ON public.blog_post_meta;
CREATE POLICY policy_blog_post_meta_upd ON public.blog_post_meta FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_post_meta.post_id
          AND (
              bp.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
              OR COALESCE(bp.is_published, 0) = 1
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_post_meta.post_id
          AND (
              bp.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
              OR COALESCE(bp.is_published, 0) = 1
          )
    )
);

DROP POLICY IF EXISTS policy_blog_post_meta_del ON public.blog_post_meta;
CREATE POLICY policy_blog_post_meta_del ON public.blog_post_meta FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_post_meta.post_id
          AND bp.coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    )
);

-- ============================================================
-- 2. AGENDAMIENTO: COACH AVAILABILITY & APPOINTMENTS (+ MEET P2P)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_availability (
    id          TEXT PRIMARY KEY,
    coach_id    TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_availability_coach_day
    ON public.coach_availability (coach_id, day_of_week);

CREATE TABLE IF NOT EXISTS public.coach_appointments (
    id           TEXT PRIMARY KEY,
    coach_id     TEXT NOT NULL,
    athlete_id   TEXT NOT NULL,
    athlete_name TEXT NOT NULL DEFAULT '',
    title        TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'scheduled',
    start_time   TEXT NOT NULL,
    end_time     TEXT NOT NULL,
    notes        TEXT NOT NULL DEFAULT '',
    meet_room_id TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coach_appointments
    ADD COLUMN IF NOT EXISTS meet_room_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_coach_appointments_coach_time
    ON public.coach_appointments (coach_id, start_time);

CREATE INDEX IF NOT EXISTS idx_coach_appointments_athlete_time
    ON public.coach_appointments (athlete_id, start_time);

ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_coach_availability_sel ON public.coach_availability;
CREATE POLICY policy_coach_availability_sel ON public.coach_availability FOR SELECT
USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR is_active = true
);

DROP POLICY IF EXISTS policy_coach_availability_ins ON public.coach_availability;
CREATE POLICY policy_coach_availability_ins ON public.coach_availability FOR INSERT
WITH CHECK (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
);

DROP POLICY IF EXISTS policy_coach_availability_upd ON public.coach_availability;
CREATE POLICY policy_coach_availability_upd ON public.coach_availability FOR UPDATE
USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
)
WITH CHECK (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
);

DROP POLICY IF EXISTS policy_coach_availability_del ON public.coach_availability;
CREATE POLICY policy_coach_availability_del ON public.coach_availability FOR DELETE
USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
);

ALTER TABLE public.coach_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_coach_appointments_sel ON public.coach_appointments;
CREATE POLICY policy_coach_appointments_sel ON public.coach_appointments FOR SELECT
USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.internal_execution_context', true) IN ('system_worker', 'webhook_worker')
);

DROP POLICY IF EXISTS policy_coach_appointments_ins ON public.coach_appointments;
CREATE POLICY policy_coach_appointments_ins ON public.coach_appointments FOR INSERT
WITH CHECK (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
);

DROP POLICY IF EXISTS policy_coach_appointments_upd ON public.coach_appointments;
CREATE POLICY policy_coach_appointments_upd ON public.coach_appointments FOR UPDATE
USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
)
WITH CHECK (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
);

DROP POLICY IF EXISTS policy_coach_appointments_del ON public.coach_appointments;
CREATE POLICY policy_coach_appointments_del ON public.coach_appointments FOR DELETE
USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
);

-- ============================================================
-- 3. CHALLENGES (PRUEBA DE FUEGO / INSIGNIA / INCENTIVO) & GAMIFICATION
-- ============================================================
ALTER TABLE public.challenges
    ADD COLUMN IF NOT EXISTS badge_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS badge_title TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS incentive_text TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_prueba_de_fuego BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS challenges_tenant_isolation_sel ON public.challenges;
CREATE POLICY challenges_tenant_isolation_sel ON public.challenges FOR SELECT
USING (
    coach_id = NULLIF(current_setting('app.current_coach_id', true), '')
    OR (
        status = 'active'
        AND EXISTS (
            SELECT 1 FROM public.coach_athlete_links cal
            WHERE cal.coach_id = challenges.coach_id
              AND cal.athlete_id = NULLIF(current_setting('app.current_user_id', true), '')
              AND cal.status = 'active'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_gamification_streaks_current
    ON public.gamification_streaks (current_streak DESC, longest_streak DESC);

CREATE INDEX IF NOT EXISTS idx_gamification_badges_badge_id
    ON public.gamification_badges (badge_id, unlocked_at DESC);

-- ============================================================
-- 4. GRANTS AL ROL mr_training_app
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
            public.blog_posts,
            public.blog_post_meta,
            public.coach_availability,
            public.coach_appointments,
            public.challenges,
            public.challenge_exercises,
            public.challenge_attempts,
            public.gamification_streaks,
            public.gamification_badges
        TO mr_training_app;
    END IF;
END $$;

COMMIT;
