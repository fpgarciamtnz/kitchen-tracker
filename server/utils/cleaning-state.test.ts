import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger } from 'evlog'
import { completeCleaningTasks, getCleaningState } from './cleaning-state'

afterEach(() => vi.unstubAllGlobals())

describe('cleaning storage diagnostics', () => {
  it('does not overwrite corrupt stored data with an empty state', async () => {
    const put = vi.fn()
    vi.stubGlobal('CLEANING_KV', { get: async () => '{private broken data', put })
    const log = createLogger({})
    await expect(completeCleaningTasks(['inside-fridges'], 'Local QA', log)).rejects.toMatchObject({ statusCode: 500 })
    expect(put).not.toHaveBeenCalled()
    expect(log.getContext()).toMatchObject({ storage: { operation: 'read', reason: 'request_failed', kind: 'kv' } })
    expect(JSON.stringify(log.getContext())).not.toContain('private broken data')
  })

  it('records a KV failure without exposing stored values', async () => {
    vi.stubGlobal('CLEANING_KV', { get: async () => { throw new Error('KV failure: Private Name') } })
    const log = createLogger({})
    await expect(getCleaningState(log)).rejects.toMatchObject({ statusCode: 500, statusMessage: 'Cleaning storage request failed' })
    expect(log.getContext()).toMatchObject({ storage: { operation: 'read', reason: 'request_failed', kind: 'kv' } })
    expect(JSON.stringify(log.getContext())).not.toContain('Private Name')
  })
})
