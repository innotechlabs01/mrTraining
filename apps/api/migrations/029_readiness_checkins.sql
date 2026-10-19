-- Morning readiness check-in (subjective, 10 seconds).
-- Additive only: new table.
CREATE TABLE IF NOT EXISTS readiness_checkins (
  id           TEXT PRIMARY KEY,
  athlete_id   TEXT NOT NULL,
  date         TEXT NOT NULL,             -- YYYY-MM-DD (athlete local day)
  readiness    INTEGER NOT NULL,          -- 1..5
  sleep_hours  REAL,
  soreness     INTEGER,                   -- 1..5 (1 = none, 5 = severe)
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_readiness_checkins_athlete_date
  ON readiness_checkins(athlete_id, date);
