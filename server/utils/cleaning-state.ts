import { createError } from 'h3'
import type { RequestLogger } from 'evlog'
import type { CleaningEvent, CleaningState } from '../../shared/cleaning'
import { cleaningTasks, createEmptyCleaningState, mergeCleaningState } from '../../shared/cleaning'

const STATE_KEY = 'cleaning:state'

type CleaningKV = { get(key: string, type: 'text'): Promise<string | null>; put(key: string, value: string): Promise<void> }

function getKV(log: RequestLogger): CleaningKV {
  const kv = (globalThis as typeof globalThis & { CLEANING_KV?: CleaningKV }).CLEANING_KV
  if (!kv) {
    log.set({ storage: { operation: 'binding_missing', kind: 'kv' } })
    throw createError({ statusCode: 500, statusMessage: 'Cleaning storage is not configured' })
  }
  return kv
}

function storageError(cause: unknown, operation: string, log: RequestLogger): never {
  log.set({ storage: { operation, kind: 'kv', reason: 'request_failed' } })
  throw createError({ statusCode: 500, statusMessage: 'Cleaning storage request failed' })
}

async function readState(log: RequestLogger): Promise<CleaningState> {
  const kv = getKV(log)
  try {
    const payload = await kv.get(STATE_KEY, 'text')
    return payload ? mergeCleaningState(JSON.parse(payload)) : createEmptyCleaningState()
  } catch (cause) { storageError(cause, 'read', log) }
}

async function writeState(state: CleaningState, log: RequestLogger) {
  const kv = getKV(log)
  try {
    await kv.put(STATE_KEY, JSON.stringify(state))
  } catch (cause) { storageError(cause, 'write', log) }
}

export async function getCleaningState(log: RequestLogger) { return readState(log) }

export async function completeCleaningTasks(taskIds: string[], by: string, log: RequestLogger) {
  const state = await readState(log)
  const timestamp = new Date().toISOString()
  const events: CleaningEvent[] = []
  for (const taskId of taskIds) {
    if (!state.items[taskId]) continue
    const event: CleaningEvent = { id: crypto.randomUUID(), timestamp, by }
    state.items[taskId].history = [...state.items[taskId].history, event].slice(-2)
    const type = cleaningTasks.find(task => task.id === taskId)?.type
    if (!type) continue
    state.queue[type] = [...state.queue[type].filter(id => id !== taskId), taskId]
    events.push(event)
  }
  await writeState(state, log)
  return { state, events }
}

export async function undoCleaningEvents(eventIds: string[], log: RequestLogger) {
  const state = await readState(log)
  const ids = new Set(eventIds)
  const undone: string[] = []
  for (const item of Object.values(state.items)) {
    const last = item.history[item.history.length - 1]
    if (last && ids.has(last.id)) { item.history.pop(); undone.push(last.id) }
  }
  for (const type of ['weekly', 'deep'] as const) {
    state.queue[type].sort((a, b) => {
      const aLast = state.items[a]?.history.at(-1)?.timestamp
      const bLast = state.items[b]?.history.at(-1)?.timestamp
      if (!aLast && !bLast) return 0
      if (!aLast) return -1
      if (!bLast) return 1
      return aLast.localeCompare(bLast)
    })
  }
  await writeState(state, log)
  return { state, undone }
}
