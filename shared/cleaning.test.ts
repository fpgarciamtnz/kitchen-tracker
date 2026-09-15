import { describe, expect, it } from 'vitest'
import { createEmptyCleaningState, mergeCleaningState, toTaskViews } from './cleaning'

describe('cleaning state', () => {
  it('creates the two five-task queues used by the first version', () => {
    const state = createEmptyCleaningState()
    expect(state.queue.weekly).toHaveLength(5)
    expect(state.queue.deep).toHaveLength(5)
  })

  it('sorts each history and derives the latest person from its final event', () => {
    const state = mergeCleaningState({
      version: 1,
      items: {
        'inside-fridges': {
          history: [
            { id: 'later', timestamp: '2026-09-15T10:00:00.000Z', by: 'Max' },
            { id: 'earlier', timestamp: '2026-09-10T10:00:00.000Z', by: 'Ana' }
          ]
        }
      }
    })

    const task = toTaskViews(state, 'weekly').find(item => item.id === 'inside-fridges')!
    expect(task.lastCleanedAt).toBe('2026-09-15T10:00:00.000Z')
    expect(task.lastCleanedBy).toBe('Max')
    expect(task.history.map(event => event.id)).toEqual(['earlier', 'later'])
  })

  it('keeps unknown tasks in the queue without inventing a date', () => {
    const state = createEmptyCleaningState()
    const tasks = toTaskViews(state, 'deep')
    expect(tasks.every(task => task.lastCleanedAt === undefined)).toBe(true)
    expect(tasks.map(task => task.id)).toEqual(state.queue.deep)
  })
})
