-- Optional manual migration. The News API also creates/backfills this table automatically.
CREATE TABLE IF NOT EXISTS news_categories (
  news_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (news_id, category_id),
  FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_news_categories_category
  ON news_categories(category_id);
INSERT OR IGNORE INTO news_categories (news_id, category_id)
SELECT id, category_id FROM news WHERE category_id IS NOT NULL;
