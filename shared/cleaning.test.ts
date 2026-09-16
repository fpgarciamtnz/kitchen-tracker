import { describe, expect, it } from 'vitest'
import { createEmptyCleaningState, mergeCleaningState, toTaskViews } from './cleaning'

describe('cleaning state', () => {
  it('creates the weekly and deep-cleaning queues', () => {
    const state = createEmptyCleaningState()
    expect(state.queue.weekly).toHaveLength(7)
    expect(state.queue.deep).toHaveLength(6)
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

  it('keeps only the two latest events per task', () => {
    const state = mergeCleaningState({ items: { 'inside-fridges': { history: [
      { id: 'one', timestamp: '2026-09-01T10:00:00.000Z', by: 'Ana' },
      { id: 'two', timestamp: '2026-09-02T10:00:00.000Z', by: 'Max' },
      { id: 'three', timestamp: '2026-09-03T10:00:00.000Z', by: 'Leo' }
    ] } } })
    expect(state.items['inside-fridges']!.history.map(event => event.id)).toEqual(['two', 'three'])
  })
})
