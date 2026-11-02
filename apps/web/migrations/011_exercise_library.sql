-- Exercise library: the shared catalog of exercises. Global rows (coach_id IS NULL)
-- are visible to every coach; custom rows are scoped to their coach.
-- Replaces the frontend mock as the source of truth for exercise metadata.

CREATE TABLE IF NOT EXISTS exercise_library (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'reps',            -- reps | time | cardio
  body_part TEXT,                               -- legs | chest | back | shoulders | arms | core | glutes | full_body
  muscle_groups TEXT NOT NULL DEFAULT '',       -- CSV of primary muscle slugs
  secondary_muscles TEXT NOT NULL DEFAULT '',   -- CSV of secondary muscle slugs
  equipment TEXT,                               -- barbell | dumbbell | bodyweight | ...
  difficulty TEXT,                              -- beginner | intermediate | advanced
  category TEXT,                                -- compound | isolation
  instructions TEXT NOT NULL DEFAULT '',        -- newline-separated steps
  default_sec INTEGER,                          -- starting target for time-mode exercises
  is_custom INTEGER NOT NULL DEFAULT 0,
  coach_id TEXT,                                -- NULL = global; set = coach's custom exercise
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_coach ON exercise_library(coach_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_name ON exercise_library(name);
