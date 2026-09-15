import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const cleaningState = sqliteTable('cleaning_state', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: integer('updated_at').notNull()
})
