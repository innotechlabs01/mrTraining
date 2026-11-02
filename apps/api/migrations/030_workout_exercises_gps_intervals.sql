-- Add GPS route and intervals to workout template exercises and assigned workout exercises.
-- Additive only: new columns with NULL defaults.
-- No existing columns or tables are modified.

-- workout_template_exercises: store coach-defined running route + intervals per exercise
ALTER TABLE workout_template_exercises ADD COLUMN gps_route TEXT;
ALTER TABLE workout_template_exercises ADD COLUMN intervals TEXT; -- JSON array of RunningInterval

-- workout_exercises: copy of template data + athlete's actual tracked data
ALTER TABLE workout_exercises ADD COLUMN gps_route TEXT;
ALTER TABLE workout_exercises ADD COLUMN intervals TEXT; -- JSON array of RunningInterval
ALTER TABLE workout_exercises ADD COLUMN actual_gps_route TEXT; -- athlete's actual GPS polyline from tracking
ALTER TABLE workout_exercises ADD COLUMN actual_intervals TEXT; -- JSON array of completed intervals with actual times/splits

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);