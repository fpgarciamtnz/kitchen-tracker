import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
export const prepState = sqliteTable('prep_state', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull(),
  document: text('document').notNull(),
})
/** One row per prep item and ordered product on each published list. See shared/prep-history.ts. */
export const prepHistory = sqliteTable(
  'prep_history',
  {
    listId: text('list_id').notNull(),
    listDate: text('list_date').notNull(),
    kind: text('kind').notNull(),
    subjectKey: text('subject_key').notNull(),
    name: text('name').notNull(),
    groupName: text('group_name').notNull().default(''),
    source: text('source').notNull().default(''),
    addedAt: integer('added_at').notNull(),
    doneAt: integer('done_at'),
    revision: integer('revision').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.listId, table.kind, table.subjectKey] }),
    index('prep_history_subject').on(table.kind, table.subjectKey, table.listDate),
  ],
)
