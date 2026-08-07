-- Add unique coach_code to coaches table
-- Code format: MR-XXXX (4 alphanumeric chars)
-- Generated once per coach at registration, never changes

ALTER TABLE coaches ADD COLUMN coach_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coaches_code ON coaches(coach_code);
