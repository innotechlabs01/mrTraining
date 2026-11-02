-- Add video_url to exercise_library for coach-uploaded exercise demonstrations.
-- Nullable: global seed exercises start without video; coaches add their own.
ALTER TABLE exercise_library ADD COLUMN video_url TEXT;
