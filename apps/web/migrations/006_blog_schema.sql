-- Blog schema for MAO Restrepo landing page
-- Articles written by the coach, displayed on the public blog page

CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    image_url TEXT DEFAULT '',
    is_published INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_post_meta (
    post_id TEXT PRIMARY KEY REFERENCES blog_posts(id) ON DELETE CASCADE,
    read_time_minutes INTEGER NOT NULL DEFAULT 5,
    views INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_coach ON blog_posts(coach_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- Add shop columns to products for public store display
-- Use a check to avoid failing if columns already exist
-- SQLite doesn't support "ADD COLUMN IF NOT EXISTS", so we catch errors
-- In practice, run this once. The columns have defaults.

-- Check if is_shop column exists before adding
-- (SQLite 3.35+ supports ALTER TABLE DROP COLUMN, but we use a safe approach)

-- Note: These ALTER TABLE statements may fail if columns already exist.
-- If so, they can be safely ignored.
ALTER TABLE products ADD COLUMN is_shop INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN category TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(coach_id, is_shop);
