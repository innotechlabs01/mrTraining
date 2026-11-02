-- running_workout_assignments — asignación de una plantilla running a un atleta.
-- Relación explícita y autorizada: coach asigna, atleta ejecuta.
CREATE TABLE IF NOT EXISTS running_workout_assignments (
    id                  TEXT PRIMARY KEY,
    template_id         TEXT NOT NULL REFERENCES running_workout_templates(id) ON DELETE RESTRICT,
    athlete_id          TEXT NOT NULL,
    coach_id            TEXT NOT NULL,
    scheduled_date      TIMESTAMPTZ NOT NULL,
    status              TEXT NOT NULL DEFAULT 'assigned', -- assigned | available | started | completed | skipped | cancelled
    athlete_instructions TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    version             INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_running_workout_assignments_athlete ON running_workout_assignments(athlete_id, status);
CREATE INDEX IF NOT EXISTS idx_running_workout_assignments_coach ON running_workout_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_running_workout_assignments_template ON running_workout_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_running_workout_assignments_deleted ON running_workout_assignments(deleted_at);
