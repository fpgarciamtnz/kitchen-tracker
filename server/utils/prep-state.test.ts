import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { createLogger } from 'evlog'
import { emptyPrepState } from '../../shared/prep'
import type { PrepCommand } from '../../shared/prep'
import { readPrep, readPrepHistory, updatePrep } from './prep-state'
const clients: Client[] = []
afterEach(() => {
  vi.unstubAllGlobals()
  for (const client of clients.splice(0)) client.close()
})
function migration(name: string) {
  return readFileSync(new URL(`../db/migrations/sqlite/${name}`, import.meta.url), 'utf8')
}
async function database({ history = true } = {}) {
  const client = createClient({ url: ':memory:' })
  clients.push(client)
  await client.execute(migration('0001_create_prep_state.sql'))
  if (history) await client.executeMultiple(migration('0003_create_prep_history.sql'))
  vi.stubGlobal('db', drizzle(client))
  return client
}
const log = createLogger({})
async function send(command: PrepCommand, revision = 0) {
  return updatePrep({ revision, command }, log)
}

describe('prep SQL storage', () => {
  it('upgrades the old empty Generics catalog while preserving the current handoff', async () => {
    const client = await database()
    const log = createLogger({})
    const legacyCurrent = {
      id: 'legacy-list',
      date: '2026-09-16',
      groups: [
        {
          id: 'generic',
          name: 'Generics',
          items: [
            { id: 'legacy-item', name: 'Keep this task', ingredients: ['Keep this product'] },
          ],
        },
      ],
      selected: ['legacy-item'],
      completed: [],
      notes: 'Keep this note',
      manualOrder: ['Keep this product'],
    }
    await client.execute({
      sql: 'INSERT INTO prep_state VALUES (1, 7, ?)',
      args: [
        JSON.stringify({
          revision: 7,
          menu: [{ id: 'generic', name: 'Generics', items: [] }],
          current: legacyCurrent,
        }),
      ],
    })

    const state = await readPrep(log)
    expect(state.revision).toBe(7)
    expect(state.menu).toEqual(emptyPrepState().menu)
    const { manualOrder, ...listed } = legacyCurrent
    expect(state.current).toEqual({ ...listed, orderAdded: manualOrder, orderRemoved: [] })

    const saved = await updatePrep(
      { revision: 7, command: { type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' } },
      log,
    )
    expect(saved.menu).toEqual(emptyPrepState().menu)
    expect((await readPrep(log)).menu).toEqual(emptyPrepState().menu)
  })

  it('identifies a missing migration and loads prep after applying it without changing cleaning data', async () => {
    const client = createClient({ url: ':memory:' })
    clients.push(client)
    vi.stubGlobal('db', drizzle(client))
    await client.execute(readFileSync(new URL('../db/migrations/sqlite/0000_create_cleaning_state.sql', import.meta.url), 'utf8'))
    await client.execute({ sql: 'INSERT INTO cleaning_state VALUES (?, ?, ?)', args: ['default', '{"existing":"cleaning history"}', 1] })
    const before = await client.execute('SELECT * FROM cleaning_state')
    const log = createLogger({})
    await expect(readPrep(log)).rejects.toMatchObject({ statusCode: 503 })
    expect(log.getContext()).toMatchObject({ database: { operation: 'prep', reason: 'missing_table' } })

    const migration = readFileSync(new URL('../db/migrations/sqlite/0001_create_prep_state.sql', import.meta.url), 'utf8')
    await client.execute(migration)
    expect(await readPrep(log)).toMatchObject({ revision: 0, current: null })
    const saved = await updatePrep({ revision: 0, command: { type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' } }, log)
    await client.execute(migration)
    expect(await readPrep(log)).toEqual(saved)
    expect((await client.execute('SELECT * FROM cleaning_state')).rows).toEqual(before.rows)
  })

  it('persists across readers and refuses to start over a list being prepared', async () => {
    await database()
    const saved = await send({ type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' })
    expect(await readPrep(log)).toEqual(saved)
    await expect(send({ type: 'start', date: '2026-09-18', listId: 'list-2026-09-18' }, 1)).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(await readPrep(log)).toEqual(saved)
  })
  it('only accepts one of two simultaneous starts, including the first save', async () => {
    await database()
    for (const round of [0, 1]) {
      const results = await Promise.allSettled([
        send({ type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' }),
        send({ type: 'start', date: '2026-09-18', listId: 'list-2026-09-18' }),
      ])
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      const state = await readPrep(log)
      expect(state.revision).toBe(round * 2 + 1)
      await send({ type: 'discard', listId: state.draft!.id })
    }
  })
  it('applies a change from a phone that missed another phone\'s change', async () => {
    await database()
    const started = await send({ type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' })
    const listId = started.draft!.id
    await send({ type: 'select', listId, ids: ['snaks-olives'], selected: true }, 1)
    // This phone still has revision 1 and has not seen the selection.
    const saved = await send(
      { type: 'select', listId, ids: ['ragu-ragu'], selected: true },
      1,
    )
    expect(saved.revision).toBe(3)
    expect(saved.draft?.selected).toEqual(['snaks-olives', 'ragu-ragu'])
  })
  it('applies simultaneous ticks from different phones', async () => {
    await database()
    const started = await send({ type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' })
    const listId = started.draft!.id
    const ids = ['snaks-olives', 'ragu-ragu', 'ragu-parmesan']
    const results = await Promise.allSettled(
      ids.map((id) => send({ type: 'select', listId, ids: [id], selected: true }, 1)),
    )
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true)
    expect((await readPrep(log)).draft?.selected.sort()).toEqual([...ids].sort())
  })
  it('records published lists in the history and keeps when an item was first done', async () => {
    const client = await database()
    const history = async () =>
      (
        await client.execute(
          'SELECT kind, subject_key, list_date, done_at FROM prep_history ORDER BY kind, subject_key',
        )
      ).rows.map((row) => [row.kind, row.subject_key, row.list_date, row.done_at])
    const started = await send({ type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' })
    const listId = started.draft!.id
    await send({ type: 'select', listId, ids: ['snaks-olives', 'ragu-ragu'], selected: true })
    await send({ type: 'order', listId, names: ['Bin bags'], ordered: true })
    // A list being prepared is not history yet.
    expect(await history()).toEqual([])
    await send({ type: 'finalize', listId })
    await send({ type: 'complete', listId, id: 'ragu-ragu', completed: true })
    const doneAt = (await history()).find((row) => row[1] === 'ragu-ragu')?.[3]
    expect(doneAt).toEqual(expect.any(Number))
    await send({ type: 'select', listId, ids: ['snaks-olives'], selected: false })
    await send({ type: 'notes', listId, text: 'Later note', base: '' })
    expect(await history()).toEqual([
      ['order', 'bin bags', '2026-09-17', null],
      ['prep', 'ragu-ragu', '2026-09-17', doneAt],
    ])

    const next = await send({ type: 'start', date: '2026-09-18', listId: 'list-2026-09-18' })
    await send({ type: 'select', listId: next.draft!.id, ids: ['ragu-ragu'], selected: true })
    await send({ type: 'finalize', listId: next.draft!.id })
    expect(await readPrepHistory('', log)).toEqual({
      prep: { 'ragu-ragu': '2026-09-18' },
      order: { 'bin bags': '2026-09-17' },
    })
    expect(await readPrepHistory(next.draft!.id, log)).toEqual({
      prep: { 'ragu-ragu': '2026-09-17' },
      order: { 'bin bags': '2026-09-17' },
    })
  })
  it('records lists with more rows than one statement can bind', async () => {
    const client = await database()
    const started = await send({ type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' })
    const ids = emptyPrepState().menu.flatMap((group) => group.items.map((item) => item.id))
    await send({ type: 'select', listId: started.draft!.id, ids, selected: true })
    await send({ type: 'finalize', listId: started.draft!.id })
    const count = await client.execute('SELECT count(*) AS rows FROM prep_history')
    expect(count.rows[0]?.rows).toBe(ids.length)
  })
  it('saves the list even when the history table is missing', async () => {
    await database({ history: false })
    const watched = createLogger({})
    const started = await updatePrep({ revision: 0, command: { type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' } }, watched)
    const saved = await updatePrep(
      { revision: 1, command: { type: 'finalize', listId: started.draft!.id } },
      watched,
    )
    expect(await readPrep(log)).toEqual(saved)
    expect(watched.getContext()).toMatchObject({
      database: { operation: 'prep_history', reason: 'missing_table' },
    })
  })
  it('does not replace corrupt state with defaults or log private content', async () => {
    const client = await database()
    const log = createLogger({})
    await client.execute({
      sql: 'INSERT INTO prep_state VALUES (1, 0, ?)',
      args: ['private broken data'],
    })
    await expect(
      updatePrep(
        { revision: 0, command: { type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' } },
        log,
      ),
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(
      (await client.execute('SELECT document FROM prep_state')).rows[0]
        ?.document,
    ).toBe('private broken data')
    expect(JSON.stringify(log.getContext())).not.toContain(
      'private broken data',
    )
  })
})
