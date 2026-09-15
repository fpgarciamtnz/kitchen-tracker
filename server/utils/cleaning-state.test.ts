import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger } from 'evlog'
import { completeCleaningTasks, getCleaningState } from './cleaning-state'

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
