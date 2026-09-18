import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  kitchenId: text('kitchen_id').notNull(),
  itemId: text('item_id'),
  itemNameSnapshot: text('item_name_snapshot').notNull(),
  dishNameSnapshot: text('dish_name_snapshot').notNull(),
  name: text('name').notNull(),
  nameKey: text('name_key').notNull(),
  revision: integer('revision').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => ({
  kitchenName: uniqueIndex('recipes_kitchen_name_key').on(table.kitchenId, table.nameKey),
  kitchenItem: index('recipes_kitchen_item').on(table.kitchenId, table.itemId),
}))

export const recipeLines = sqliteTable('recipe_lines', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').notNull(),
  section: text('section').notNull(),
  position: integer('position').notNull(),
  text: text('text').notNull(),
}, table => ({
  ordering: index('recipe_lines_recipe_section_position').on(table.recipeId, table.section, table.position),
}))

export const recipeImages = sqliteTable('recipe_images', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').notNull(),
  slot: integer('slot').notNull(),
  mimeType: text('mime_type').notNull(),
  imageData: text('image_data').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: integer('created_at').notNull(),
}, table => ({
  recipeSlot: uniqueIndex('recipe_images_recipe_slot').on(table.recipeId, table.slot),
}))
