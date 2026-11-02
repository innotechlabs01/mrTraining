-- Video Challenges system (PostgreSQL equivalent of 008_video_challenges.sql)
CREATE TABLE IF NOT EXISTS challenges (
    id              TEXT PRIMARY KEY,
    coach_id        TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    exercise_type   TEXT NOT NULL,
    video_url       TEXT,
    duration_minutes INTEGER DEFAULT 15,
    calories        INTEGER DEFAULT 100,
    target_sets     INTEGER DEFAULT 3,
    target_reps     INTEGER DEFAULT 10,
    scoring_type    TEXT NOT NULL DEFAULT 'form_score',
    difficulty_level TEXT NOT NULL DEFAULT 'intermediate',
    max_attempts    INTEGER NOT NULL DEFAULT 2,
    status          TEXT NOT NULL DEFAULT 'draft',
    start_date      TEXT,
    end_date        TEXT,
    expires_at      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_attempts (
    id               TEXT PRIMARY KEY,
    challenge_id     TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    athlete_id       TEXT NOT NULL,
    attempt_number   INTEGER NOT NULL DEFAULT 1,
    consent_given_at TEXT,
    video_consent    INTEGER NOT NULL DEFAULT 0,
    photo_consent    INTEGER NOT NULL DEFAULT 0,
    video_url        TEXT,
    form_score       REAL,
    depth_score      REAL,
    alignment_score  REAL,
    tempo_score      REAL,
    sets_completed   INTEGER NOT NULL DEFAULT 0,
    reps_completed   INTEGER NOT NULL DEFAULT 0,
    total_volume     REAL,
    notes            TEXT,
    status           TEXT NOT NULL DEFAULT 'in_progress',
    completed_at     TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(challenge_id, athlete_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_challenges_coach ON challenges(coach_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_attempts_challenge ON challenge_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_attempts_athlete ON challenge_attempts(athlete_id);
