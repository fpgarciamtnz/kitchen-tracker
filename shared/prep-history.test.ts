import { describe, expect, it } from 'vitest'
import { applyPrepCommand, emptyPrepState } from './prep'
import type { PrepCommand, PrepGroup, ProductGroup } from './prep'
import { daysBetween, historyRows, localDate } from './prep-history'

const menu: PrepGroup[] = [
  {
    id: 'caesar',
    name: 'Caesar',
    items: [
      { id: 'lettuce', name: 'Cut lettuce', ingredients: ['Lettuce'] },
      { id: 'dressing', name: 'Make dressing', ingredients: ['Oil'] },
    ],
  },
]
const products: ProductGroup[] = [
  { id: 'basics', name: 'Basics', products: ['Salt', 'Sugar'] },
]

describe('prep history rows', () => {
  it('records selected prep, its completion and every product on the order', () => {
    let state = applyPrepCommand(
      { ...emptyPrepState(), menu, products },
      { type: 'start', date: '2026-10-23', listId: 'list-2026-10-23' },
    )
    const listId = state.draft!.id
    const commands: PrepCommand[] = [
      { type: 'select', listId, ids: ['lettuce', 'dressing'], selected: true },
      { type: 'complete', listId, id: 'lettuce', completed: true },
      { type: 'order', listId, names: ['Oil'], ordered: false },
      { type: 'order', listId, names: ['Salt', 'Bin bags'], ordered: true },
    ]
    for (const command of commands)
      state = applyPrepCommand(state, command)

    expect(historyRows(state.draft!, products)).toEqual([
      { listId, listDate: '2026-10-23', kind: 'prep', subjectKey: 'lettuce', name: 'Cut lettuce', groupName: 'Caesar', source: '', done: true },
      { listId, listDate: '2026-10-23', kind: 'prep', subjectKey: 'dressing', name: 'Make dressing', groupName: 'Caesar', source: '', done: false },
      { listId, listDate: '2026-10-23', kind: 'order', subjectKey: 'lettuce', name: 'Lettuce', groupName: '', source: 'prep', done: false },
      { listId, listDate: '2026-10-23', kind: 'order', subjectKey: 'salt', name: 'Salt', groupName: 'Basics', source: 'catalog', done: false },
      { listId, listDate: '2026-10-23', kind: 'order', subjectKey: 'bin bags', name: 'Bin bags', groupName: '', source: 'other', done: false },
    ])
  })
  it('counts calendar days between list dates', () => {
    expect(daysBetween('2026-10-20', '2026-10-23')).toBe(3)
    expect(daysBetween('2026-10-23', '2026-10-20')).toBe(-3)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
