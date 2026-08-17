# Main Category + Sub-category

This update adds `parent_id` support to the `categories` table.

## D1 migration

Run once:

```sql
ALTER TABLE categories ADD COLUMN parent_id INTEGER DEFAULT NULL;
```

If `parent_id` already exists, do not run the ALTER statement again.

## Usage

- `parent_id = NULL` -> Main category
- `parent_id = <main category id>` -> Sub-category

The Admin Category editor now has a **मुख्य श्रेणी** dropdown.

The public navigation now shows:

Main Category ▼
- Sub-category
- Sub-category

On mobile, the main category opens/closes as an accordion.

Category pages include published news from the selected category and its sub-categories.
