-- D1 migration: nested categories / sub-categories
-- Run once in Cloudflare D1.
ALTER TABLE categories ADD COLUMN parent_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
