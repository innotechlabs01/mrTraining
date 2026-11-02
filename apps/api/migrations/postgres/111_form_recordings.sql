-- Form Recordings (PostgreSQL equivalent of 011_form_recordings.sql)
CREATE TABLE IF NOT EXISTS form_recordings (
    id           TEXT PRIMARY KEY,
    athlete_id   TEXT NOT NULL,
    exercise_id  TEXT NOT NULL,
    workout_id   TEXT,
    form_score   REAL NOT NULL,
    form_metrics TEXT,
    video_url    TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_recordings_athlete ON form_recordings(athlete_id);
CREATE INDEX IF NOT EXISTS idx_form_recordings_athlete_exercise ON form_recordings(athlete_id, exercise_id);
