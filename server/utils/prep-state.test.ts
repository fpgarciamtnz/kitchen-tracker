import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { createLogger } from 'evlog'
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
