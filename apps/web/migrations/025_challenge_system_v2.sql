-- Challenge System v2: Coach creates drafts → activates → athletes participate with consent
-- Supports leaderboards, scoring types, countdown, and 2 attempts max

-- challenges: add new columns
ALTER TABLE challenges ADD COLUMN scoring_type TEXT DEFAULT 'form_score';
ALTER TABLE challenges ADD COLUMN difficulty_level TEXT DEFAULT 'intermediate';
ALTER TABLE challenges ADD COLUMN max_attempts INTEGER DEFAULT 2;
ALTER TABLE challenges ADD COLUMN expires_at TEXT;

-- Rename challenge_participations → challenge_attempts
ALTER TABLE challenge_participations RENAME TO challenge_attempts;

-- challenge_attempts: add new columns
ALTER TABLE challenge_attempts ADD COLUMN consent_given_at TEXT;
ALTER TABLE challenge_attempts ADD COLUMN total_volume REAL;
ALTER TABLE challenge_attempts ADD COLUMN video_consent INTEGER DEFAULT 0;
ALTER TABLE challenge_attempts ADD COLUMN photo_consent INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attempts_athlete ON challenge_attempts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_attempts_challenge_status ON challenge_attempts(challenge_id, status);
