-- running_workout_segments — segmentos ordenados dentro de una plantilla running.
-- Cada segmento: calentamiento, carrera principal, intervalo, recuperación, enfriamiento.
CREATE TABLE IF NOT EXISTS running_workout_segments (
    id                    TEXT PRIMARY KEY,
    template_id           TEXT NOT NULL REFERENCES running_workout_templates(id) ON DELETE CASCADE,
    order_index           INTEGER NOT NULL DEFAULT 0,
    type                  TEXT NOT NULL DEFAULT 'warmup', -- warmup | main | interval | recovery | cooldown
    instruction           TEXT NOT NULL DEFAULT '',
    spoken_instruction    TEXT,
    target_duration_sec   INTEGER,
    target_distance_km    REAL,
    target_pace_min_per_km REAL,
    target_pace_max_per_km REAL,
    target_heart_rate_min  INTEGER,
    target_heart_rate_max  INTEGER,
    repetitions           INTEGER,
    recovery_sec          INTEGER,
    completion_criteria   TEXT NOT NULL DEFAULT 'manual', -- time | distance | manual
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,
    version               INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_running_workout_segments_template ON running_workout_segments(template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_running_workout_segments_deleted ON running_workout_segments(deleted_at);
