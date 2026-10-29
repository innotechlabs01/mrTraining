-- running_workout_snapshots — instantánea inmutable de la prescripción al iniciar una sesión.
-- Si el coach modifica la plantilla después, la sesión iniciada conserva su snapshot.
CREATE TABLE IF NOT EXISTS running_workout_snapshots (
    id           TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES running_workout_assignments(id) ON DELETE CASCADE,
    session_id   TEXT NOT NULL REFERENCES running_sessions(id) ON DELETE CASCADE,
    template_copy JSONB NOT NULL, -- copia completa de la plantilla + segmentos en el momento de iniciar
    captured_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_running_workout_snapshots_session ON running_workout_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_running_workout_snapshots_assignment ON running_workout_snapshots(assignment_id);
