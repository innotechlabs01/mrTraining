-- Store orders + items.
-- Cart checkout with MercadoPago: an order is created as `pending` together
-- with its items; the payment webhook fulfills it transactionally (validates
-- stock, records purchases, decrements stock) exactly once.

CREATE TABLE IF NOT EXISTS store_orders (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | failed
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'COP',
  external_ref TEXT,                          -- MP payment id (set on approval)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS store_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  unit_price REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  fulfilled INTEGER NOT NULL DEFAULT 0       -- 1 once stock was decremented
);

CREATE INDEX IF NOT EXISTS idx_store_orders_athlete ON store_orders(athlete_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);
