-- plans base table if not already created (ensures independent order execution)
CREATE TABLE IF NOT EXISTS plans (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL DEFAULT '',
    description          TEXT NOT NULL DEFAULT '',
    price                REAL NOT NULL DEFAULT 0,
    currency             TEXT NOT NULL DEFAULT 'COP',
    billing_period       TEXT NOT NULL DEFAULT 'monthly',
    max_athletes         INTEGER NOT NULL DEFAULT 10,
    max_sessions_per_week INTEGER NOT NULL DEFAULT 12,
    is_active            INTEGER NOT NULL DEFAULT 0,
    athlete_count        INTEGER NOT NULL DEFAULT 0,
    coach_id             TEXT NOT NULL DEFAULT '',
    trm                  REAL NOT NULL DEFAULT 0,
    discount_type        TEXT NOT NULL DEFAULT '',
    discount_value       REAL NOT NULL DEFAULT 0,
    discount_label       TEXT NOT NULL DEFAULT '',
    discount_valid_from  TEXT NOT NULL DEFAULT '',
    discount_valid_until TEXT NOT NULL DEFAULT '',
    discount_code        TEXT NOT NULL DEFAULT '',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_coach ON plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_plans_coach_active ON plans(coach_id, is_active);

-- plan_versions — versiones de precios y duración para planes de entrenamiento.
-- Permite que un plan tenga múltiples versiones con diferentes precios y duraciones.
CREATE TABLE IF NOT EXISTS plan_versions (
    id           TEXT PRIMARY KEY,
    plan_id      TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    price_cents  INTEGER NOT NULL DEFAULT 0,
    currency     TEXT NOT NULL DEFAULT 'USD',
    duration_unit TEXT NOT NULL DEFAULT 'month', -- week | month | quarter | year
    benefits     TEXT NOT NULL DEFAULT '',
    cta_text     TEXT NOT NULL DEFAULT 'Comprar ahora',
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_versions_plan ON plan_versions(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_versions_active ON plan_versions(is_active);
