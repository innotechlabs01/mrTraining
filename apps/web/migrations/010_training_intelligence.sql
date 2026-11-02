-- Training intelligence: enrich workout_exercises and workout_set_logs so progression,
-- 1RM estimation, effort (RIR/RPE), timed/cardio modes, supersets and muscle-based
-- fatigue can be computed from logged history.
-- ADDITIVE ONLY: every new column is nullable or has a default, legacy rows stay valid.

-- ============== workout_exercises (the prescription) ==============

ALTER TABLE workout_exercises ADD COLUMN mode TEXT NOT NULL DEFAULT 'reps';        -- reps | time | cardio
ALTER TABLE workout_exercises ADD COLUMN phase TEXT NOT NULL DEFAULT 'work';       -- work | warmup
ALTER TABLE workout_exercises ADD COLUMN superset_group TEXT;                      -- groups exercises paired back-to-back
ALTER TABLE workout_exercises ADD COLUMN reps_min INTEGER;                         -- double progression range bottom
ALTER TABLE workout_exercises ADD COLUMN reps_max INTEGER;                         -- double progression range top
ALTER TABLE workout_exercises ADD COLUMN prog TEXT;                                -- off | linear | greyskull | double | time
ALTER TABLE workout_exercises ADD COLUMN inc REAL;                                 -- load step override (kg)
ALTER TABLE workout_exercises ADD COLUMN sec INTEGER;                              -- target seconds (time mode)
ALTER TABLE workout_exercises ADD COLUMN minutes REAL;                             -- duration minutes (cardio mode)
ALTER TABLE workout_exercises ADD COLUMN speed REAL;                               -- speed (cardio mode)
ALTER TABLE workout_exercises ADD COLUMN per_side INTEGER NOT NULL DEFAULT 0;      -- unilateral: total steps by 2
ALTER TABLE workout_exercises ADD COLUMN body_part TEXT;                           -- coarse body part (legs, chest, ...)
ALTER TABLE workout_exercises ADD COLUMN muscle_groups TEXT NOT NULL DEFAULT '';   -- CSV slugs for fatigue mapping
ALTER TABLE workout_exercises ADD COLUMN library_exercise_id TEXT;                 -- ref into exercise_library (app-enforced)

-- ============== workout_set_logs (what actually happened) ==============

ALTER TABLE workout_set_logs ADD COLUMN phase TEXT;                                -- work | warmup (null = legacy work)
ALTER TABLE workout_set_logs ADD COLUMN rir REAL;                                  -- reps in reserve 0..10
ALTER TABLE workout_set_logs ADD COLUMN rpe REAL;                                  -- rating of perceived exertion 6..10
ALTER TABLE workout_set_logs ADD COLUMN sec INTEGER;                               -- held seconds (time mode)
ALTER TABLE workout_set_logs ADD COLUMN minutes REAL;                              -- minutes (cardio mode)
ALTER TABLE workout_set_logs ADD COLUMN speed REAL;                                -- speed (cardio mode)
ALTER TABLE workout_set_logs ADD COLUMN skipped INTEGER NOT NULL DEFAULT 0;

-- History lookups per exercise (progression / 1RM / fatigue scans).
CREATE INDEX IF NOT EXISTS idx_set_log_exercise ON workout_set_logs(exercise_id);
