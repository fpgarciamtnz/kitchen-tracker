import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
export const prepState = sqliteTable('prep_state', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull(),
  document: text('document').notNull(),
})
