-- Store purchases.
-- Backs POST /api/v1/athlete/store/purchase (internal/infrastructure/store).
-- The remote dev DB predates this table; `products` already exists.

CREATE TABLE IF NOT EXISTS store_purchases (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_store_purchases_athlete ON store_purchases(athlete_id);
CREATE INDEX IF NOT EXISTS idx_store_purchases_product ON store_purchases(product_id);
