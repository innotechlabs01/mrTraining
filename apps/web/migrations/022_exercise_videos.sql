-- Exercise demo videos: coach uploads to Vercel, URL stored here.
-- Videos are attached to exercises so athletes can watch form demos.

CREATE TABLE IF NOT EXISTS exercise_videos (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec REAL,
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'video/mp4',
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_exercise ON exercise_videos(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_coach ON exercise_videos(coach_id, created_at DESC);

-- Athlete form recordings: athlete records themselves doing an exercise.
-- Video uploaded to Vercel, URL stored here for coach review.

CREATE TABLE IF NOT EXISTS athlete_form_recordings (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
  workout_id TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec REAL,
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'video/mp4',
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  coach_feedback TEXT,
  coach_rating INTEGER CHECK (coach_rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_form_recordings_exercise ON athlete_form_recordings(exercise_id);
CREATE INDEX IF NOT EXISTS idx_form_recordings_athlete ON athlete_form_recordings(athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_recordings_coach_view ON athlete_form_recordings(athlete_id, status, created_at DESC);

-- Coach video feedback: coach can reply to form recordings with video.

CREATE TABLE IF NOT EXISTS coach_video_feedback (
  id TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL REFERENCES athlete_form_recordings(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec REAL,
  mime_type TEXT DEFAULT 'video/mp4',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coach_video_feedback_recording ON coach_video_feedback(recording_id);

-- Video view metrics: tracks how athletes watch videos.
-- Every play session generates one row with engagement data.

CREATE TABLE IF NOT EXISTS video_view_metrics (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  video_type TEXT NOT NULL CHECK (video_type IN ('demo', 'form', 'feedback')),
  athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
  duration_sec REAL NOT NULL DEFAULT 0,
  max_position_sec REAL NOT NULL DEFAULT 0,
  completed_pct REAL NOT NULL DEFAULT 0,
  pause_count INTEGER NOT NULL DEFAULT 0,
  replay_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_video_metrics_athlete ON video_view_metrics(athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_metrics_video ON video_view_metrics(video_id, video_type);
CREATE INDEX IF NOT EXISTS idx_video_metrics_exercise ON video_view_metrics(video_id, athlete_id);
