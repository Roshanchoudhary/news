-- Tirhuta/Mathili News Portal: Main Category + Sub-category
-- Run this once on the existing Cloudflare D1 database.

ALTER TABLE categories
ADD COLUMN parent_id INTEGER DEFAULT NULL;

-- Verify:
-- PRAGMA table_info(categories);

-- Main category: parent_id = NULL
-- Sub-category: parent_id = the main category's id
