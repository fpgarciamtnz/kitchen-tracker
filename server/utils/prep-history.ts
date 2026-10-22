import { and, eq, lt, ne, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { historyRows } from '../../shared/prep-history'
import type { PrepHistory } from '../../shared/prep-history'
import type { PrepList, ProductGroup } from '../../shared/prep'
import { prepHistory } from '../db/prep-schema'

// D1 binds at most 100 parameters per statement and each row uses 10.
const ROWS_PER_INSERT = 9

/** Makes the history rows of each list match the list as saved at this revision. */
export async function syncPrepHistory(
  lists: PrepList[],
  products: ProductGroup[],
  revision: number,
) {
  const now = Date.now()
  const statements: BatchItem<'sqlite'>[] = []
  for (const list of lists) {
    const rows = historyRows(list, products).map((row) => ({
      listId: row.listId,
      listDate: row.listDate,
      kind: row.kind,
      subjectKey: row.subjectKey,
      name: row.name,
      groupName: row.groupName,
      source: row.source,
      addedAt: now,
      doneAt: row.done ? now : null,
      revision,
    }))
    for (let start = 0; start < rows.length; start += ROWS_PER_INSERT)
      statements.push(
        db
          .insert(prepHistory)
          .values(rows.slice(start, start + ROWS_PER_INSERT))
          .onConflictDoUpdate({
            target: [prepHistory.listId, prepHistory.kind, prepHistory.subjectKey],
            set: {
              listDate: sql`excluded.list_date`,
              name: sql`excluded.name`,
              groupName: sql`excluded.group_name`,
              source: sql`excluded.source`,
              // Keep the moment it was first ticked.
              doneAt: sql`CASE WHEN excluded.done_at IS NULL THEN NULL ELSE coalesce(${prepHistory.doneAt}, excluded.done_at) END`,
              revision: sql`excluded.revision`,
            },
            // Requests can finish out of order; an older state never overwrites a newer one.
            setWhere: sql`excluded.revision >= ${prepHistory.revision}`,
          }),
      )
    // Rows this revision did not write are deselected items or products taken off the order.
    statements.push(
      db
        .delete(prepHistory)
        .where(and(eq(prepHistory.listId, list.id), lt(prepHistory.revision, revision))),
    )
  }
  const [first, ...rest] = statements
  if (first) await db.batch([first, ...rest])
}

/** Latest list date of every prep item and product, ignoring one list. */
export async function queryPrepHistory(excludeListId: string): Promise<PrepHistory> {
  const rows = await db
    .select({
      kind: prepHistory.kind,
      key: prepHistory.subjectKey,
      last: sql<string>`max(${prepHistory.listDate})`,
    })
    .from(prepHistory)
    .where(ne(prepHistory.listId, excludeListId))
    .groupBy(prepHistory.kind, prepHistory.subjectKey)
    .all()
  const history: PrepHistory = { prep: {}, order: {} }
  for (const row of rows)
    if (row.kind === 'prep' || row.kind === 'order') history[row.kind][row.key] = row.last
  return history
}
