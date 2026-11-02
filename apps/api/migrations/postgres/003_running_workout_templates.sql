-- running_workout_templates — plantillas de entrenamiento running diseñadas por coaches.
-- Segmentos ordenados: calentamiento, carrera principal, series/intervalos, recuperación, enfriamiento.
CREATE TABLE IF NOT EXISTS running_workout_templates (
    id                    TEXT PRIMARY KEY,
    coach_id              TEXT NOT NULL,
    name                  TEXT NOT NULL,
    description           TEXT NOT NULL DEFAULT '',
    type                  TEXT NOT NULL DEFAULT 'free_run', -- free_run | continuous_distance | timed_run | intervals | series | recovery | tempo | progressive
    target_pace_min_per_km REAL,
    target_pace_max_per_km REAL,
    target_heart_rate_min  INTEGER,
    target_heart_rate_max  INTEGER,
    target_cadence         INTEGER,
    target_distance_km     REAL,
    target_duration_sec    INTEGER,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at             TIMESTAMPTZ,
    version                INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_running_workout_templates_coach ON running_workout_templates(coach_id);
CREATE INDEX IF NOT EXISTS idx_running_workout_templates_type ON running_workout_templates(type);
CREATE INDEX IF NOT EXISTS idx_running_workout_templates_deleted ON running_workout_templates(deleted_at);
