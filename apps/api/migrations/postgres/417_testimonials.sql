-- 417_testimonials.sql
-- Testimonios de coaches para landing pages públicas
CREATE TABLE IF NOT EXISTS testimonials (
    id           TEXT PRIMARY KEY,
    coach_id     TEXT NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    role         TEXT NOT NULL,
    text         TEXT NOT NULL,
    stars        INTEGER NOT NULL DEFAULT 5 CHECK (stars >= 1 AND stars <= 5),
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_coach_id ON testimonials(coach_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(is_published);

-- RLS: coach es el tenant
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS testimonials_coach_isolation ON testimonials;
CREATE POLICY testimonials_coach_isolation ON testimonials
    FOR ALL
    USING (coach_id = current_setting('app.current_coach_id', true)::text);
