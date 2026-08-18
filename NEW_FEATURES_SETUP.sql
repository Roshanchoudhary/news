-- Optional D1 setup for the new features.
-- The application also creates these tables automatically on first use.

CREATE TABLE IF NOT EXISTS news_categories (
  news_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (news_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_news_categories_news_id ON news_categories(news_id);
CREATE INDEX IF NOT EXISTS idx_news_categories_category_id ON news_categories(category_id);

CREATE TABLE IF NOT EXISTS news_ads (
  news_id INTEGER PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER,
  visitor_id TEXT NOT NULL,
  path TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  language TEXT,
  screen TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analytics_news ON analytics_events(news_id);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

-- Migrate the old primary category to the multi-category relation.
INSERT OR IGNORE INTO news_categories(news_id, category_id)
SELECT id, category_id FROM news WHERE category_id IS NOT NULL;
