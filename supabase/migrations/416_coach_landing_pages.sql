-- 416_coach_landing_pages.sql
-- Landing pages públicas de coach (sin redeploy, servidas desde DB).
-- Cada coach puede crear su propia landing con slug único.
CREATE TABLE IF NOT EXISTS coach_landing_pages (
    id             TEXT PRIMARY KEY,
    coach_id       TEXT NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    slug           TEXT UNIQUE NOT NULL,
    title          TEXT,
    subtitle       TEXT,
    config         JSONB DEFAULT '{}',
    sections       JSONB DEFAULT '[]',
    images         JSONB DEFAULT '[]',
    is_published   BOOLEAN DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_landing_pages_coach_id ON coach_landing_pages(coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_landing_pages_slug ON coach_landing_pages(slug);

-- RLS: coach es el tenant, solo él puede editar su landing
ALTER TABLE coach_landing_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coach_landing_pages_coach_isolation ON coach_landing_pages;
CREATE POLICY coach_landing_pages_coach_isolation ON coach_landing_pages
    FOR ALL
    USING (coach_id = current_setting('app.current_coach_id', true)::text);

-- Super admin puede ver todas (bypass RLS via platform super admin allowlist en app)
