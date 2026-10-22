import { orderLines, selectedGroups } from './prep'
import type { PrepList, ProductGroup } from './prep'

// Tracking catalog: every published prep list leaves one row per selected
// prep item and per ordered product. Later versions can learn from these rows
// how often each thing is needed and suggest it on new lists.
export type HistoryKind = 'prep' | 'order'
export interface HistoryRow {
  listId: string
  /** Day the list was for. */
  listDate: string
  kind: HistoryKind
  /** Prep item ID, or product key for orders. */
  subjectKey: string
  name: string
  /** Dish for prep items, catalog group for catalog products. */
  groupName: string
  /** Where an ordered product came from: prep, catalog or other. */
  source: '' | 'prep' | 'catalog' | 'other'
  /** Prep item ticked as done. */
  done: boolean
}
export function historyRows(
  list: PrepList,
  products: ProductGroup[],
): HistoryRow[] {
  const base = { listId: list.id, listDate: list.date }
  return [
    ...selectedGroups(list).flatMap((group) =>
      group.items.map((item) => ({
        ...base,
        kind: 'prep' as const,
        subjectKey: item.id,
        name: item.name,
        groupName: group.name,
        source: '' as const,
        done: list.completed.includes(item.id),
      })),
    ),
    ...orderLines(list, products)
      .filter((line) => line.ordered)
      .map((line) => ({
        ...base,
        kind: 'order' as const,
        subjectKey: line.key,
        name: line.name,
        groupName: line.groupName ?? '',
        source: line.section,
        done: false,
      })),
  ]
}

/** Latest list date for each prep item ID and product key. */
export interface PrepHistory {
  prep: Record<string, string>
  order: Record<string, string>
}

/** Local calendar day as YYYY-MM-DD. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
/** Whole days from one YYYY-MM-DD date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}
