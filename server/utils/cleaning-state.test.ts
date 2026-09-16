import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger } from 'evlog'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { readFileSync } from 'node:fs'
import { createEmptyCleaningState } from '../../shared/cleaning'
import { completeCleaningTasks, getCleaningState, undoCleaningEvents } from './cleaning-state'

afterEach(() => vi.unstubAllGlobals())

describe('cleaning storage diagnostics', () => {
  it('does not overwrite corrupt stored data with an empty state', async () => {
    const insert = vi.fn()
    vi.stubGlobal('db', {
      select: () => ({ from: () => ({ where: () => ({ get: async () => ({ payload: '{private broken data' }) }) }) }),
      insert
    })
    const log = createLogger({})
    await expect(completeCleaningTasks(['inside-fridges'], 'Local QA', log)).rejects.toMatchObject({ statusCode: 500 })
    expect(insert).not.toHaveBeenCalled()
    expect(log.getContext()).toMatchObject({ database: { operation: 'read', reason: 'invalid_state' } })
    expect(JSON.stringify(log.getContext())).not.toContain('private broken data')
  })

  it('records a database failure without exposing query parameters', async () => {
    vi.stubGlobal('db', {
      select: () => ({ from: () => ({ where: () => ({ get: async () => { throw new Error('no such table: cleaning_state; params: Private Name') } }) }) })
    })
    const log = createLogger({})
    await expect(getCleaningState(log)).rejects.toMatchObject({ statusCode: 500, statusMessage: 'Cleaning database request failed' })
    expect(log.getContext()).toMatchObject({ database: { operation: 'read', reason: 'missing_table' } })
    expect(JSON.stringify(log.getContext())).not.toContain('Private Name')
  })
})

describe('existing D1 data compatibility', () => {
  it('reads the original schema, saves only two events, and can undo without losing other tasks', async () => {
    const client = createClient({ url: ':memory:' })
    try {
      await client.execute(readFileSync(new URL('../db/migrations/sqlite/0000_create_cleaning_state.sql', import.meta.url), 'utf8'))
      const previous = createEmptyCleaningState()
      previous.items['inside-fridges'] = { history: [
        { id: 'old-1', timestamp: '2026-09-01T12:00:00Z', by: 'Cook A' },
        { id: 'old-2', timestamp: '2026-09-08T12:00:00Z', by: 'Cook B' }
      ] }
      await client.execute({ sql: 'INSERT INTO cleaning_state (id, payload, updated_at) VALUES (?, ?, ?)', args: ['default', JSON.stringify(previous), 1] })
      vi.stubGlobal('db', drizzle(client))
      const log = createLogger({})
      expect(await getCleaningState(log)).toEqual(previous)

      const saved = await completeCleaningTasks(['inside-fridges'], 'Cook C', log)
      const persisted = await getCleaningState(log)
      expect(persisted.items['inside-fridges']?.history.map(event => event.by)).toEqual(['Cook B', 'Cook C'])
      expect(persisted.queue.weekly.at(-1)).toBe('inside-fridges')
      expect(persisted.items['oven-area']).toEqual(previous.items['oven-area'])

      await undoCleaningEvents(saved.events.map(event => event.id), log)
      expect((await getCleaningState(log)).items['inside-fridges']?.history.map(event => event.by)).toEqual(['Cook B'])
    } finally {
      client.close()
    }
  })
})
