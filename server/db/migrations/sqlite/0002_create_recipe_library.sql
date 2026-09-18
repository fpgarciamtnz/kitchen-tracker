CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL,
  item_id TEXT,
  item_name_snapshot TEXT NOT NULL,
  dish_name_snapshot TEXT NOT NULL,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_lines (
  id TEXT PRIMARY KEY NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('ingredients', 'steps')),
  position INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_images (
  id TEXT PRIMARY KEY NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot IN (1, 2)),
  mime_type TEXT NOT NULL,
  image_data TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (recipe_id, slot)
);

CREATE UNIQUE INDEX IF NOT EXISTS recipes_kitchen_name_key ON recipes(kitchen_id, name_key);
CREATE INDEX IF NOT EXISTS recipes_kitchen_item ON recipes(kitchen_id, item_id);
CREATE INDEX IF NOT EXISTS recipe_lines_recipe_section_position ON recipe_lines(recipe_id, section, position);
CREATE INDEX IF NOT EXISTS recipe_images_recipe_slot ON recipe_images(recipe_id, slot);
