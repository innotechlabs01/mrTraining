-- Athlete profile schedule + training mode
--
-- Adds training mode and schedule to the existing athlete_profiles table.
-- Idempotency guard (manual apply, no runner): SQLite has no
-- `ADD COLUMN IF NOT EXISTS`, so these statements are the guard. Re-applying
-- them fails with "duplicate column name" and the columns are left untouched.
-- A duplicate column can NEVER be created, so re-running this migration is
-- harmless. Verify with:
--   PRAGMA table_info('athlete_profiles');   -- expect one row per new column
ALTER TABLE athlete_profiles ADD COLUMN modality TEXT DEFAULT '';
ALTER TABLE athlete_profiles ADD COLUMN schedule_days TEXT DEFAULT '';
ALTER TABLE athlete_profiles ADD COLUMN schedule_time TEXT DEFAULT '';
