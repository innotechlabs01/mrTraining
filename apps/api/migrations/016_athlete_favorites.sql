-- Athlete favorites.
-- Lets athletes bookmark workouts, videos, and articles. Backs the
-- /api/v1/favorites endpoints (see internal/infrastructure/favorite).

CREATE TABLE IF NOT EXISTS athlete_favorites (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_title TEXT NOT NULL DEFAULT '',
  item_meta TEXT,
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_favorites_athlete ON athlete_favorites(athlete_id);
