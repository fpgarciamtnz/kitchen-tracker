import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { createLogger } from 'evlog'
import { emptyPrepState } from '../../shared/prep'
import { readPrep, updatePrep } from './prep-state'
const clients: Client[] = []
afterEach(() => {
  vi.unstubAllGlobals()
  for (const client of clients.splice(0)) client.close()
})
async function database() {
  const client = createClient({ url: ':memory:' })
  clients.push(client)
  await client.execute(
    readFileSync(
      new URL(
        '../db/migrations/sqlite/0001_create_prep_state.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  vi.stubGlobal('db', drizzle(client))
  return client
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
    expect(state.current).toEqual(legacyCurrent)

    const saved = await updatePrep(
      { revision: 7, command: { type: 'start', date: '2026-09-17' } },
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
    const saved = await updatePrep({ revision: 0, command: { type: 'start', date: '2026-09-17' } }, log)
    await client.execute(migration)
    expect(await readPrep(log)).toEqual(saved)
    expect((await client.execute('SELECT * FROM cleaning_state')).rows).toEqual(before.rows)
  })

  it('persists across readers and rejects a stale writer', async () => {
    await database()
    const log = createLogger({})
    const current = await updatePrep(
      { revision: 0, command: { type: 'start', date: '2026-09-17' } },
      log,
    )
    expect(await readPrep(log)).toEqual(current)
    await expect(
      updatePrep(
        { revision: 0, command: { type: 'start', date: '2026-09-18' } },
        log,
      ),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(await readPrep(log)).toEqual(current)
  })
  it('only accepts one of two simultaneous replacements, including the first save', async () => {
    await database()
    const log = createLogger({})
    for (const revision of [0, 1]) {
      const results = await Promise.allSettled([
        updatePrep(
          { revision, command: { type: 'start', date: '2026-09-17' } },
          log,
        ),
        updatePrep(
          { revision, command: { type: 'start', date: '2026-09-18' } },
          log,
        ),
      ])
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1)
      expect((await readPrep(log)).revision).toBe(revision + 1)
    }
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
        { revision: 0, command: { type: 'start', date: '2026-09-17' } },
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
