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
