import { createError } from 'h3'
import type { RequestLogger } from 'evlog'
import { eq } from 'drizzle-orm'
import type { CleaningEvent, CleaningState } from '../../shared/cleaning'
import { cleaningTasks, createEmptyCleaningState, mergeCleaningState } from '../../shared/cleaning'
import { cleaningState } from '../db/schema'

const STATE_ID = 'default'

function databaseError(cause: unknown, operation: string, log: RequestLogger): never {
  const message = cause instanceof Error ? cause.message : ''
  const reason = /no such table/i.test(message) ? 'missing_table' : /binding|DB is not defined/i.test(message) ? 'missing_binding' : 'query_failed'
  log.set({ database: { operation, reason } })
  // Drizzle errors may contain query parameters, including the stored names.
  throw createError({ statusCode: 500, statusMessage: 'Cleaning database request failed' })
}

async function readState(log: RequestLogger): Promise<CleaningState> {
  let row
  try {
    row = await db.select().from(cleaningState).where(eq(cleaningState.id, STATE_ID)).get()
  } catch (cause) { databaseError(cause, 'read', log) }
  if (!row) return createEmptyCleaningState()
  try { return mergeCleaningState(JSON.parse(row.payload)) } catch {
    log.set({ database: { operation: 'read', reason: 'invalid_state' } })
    throw createError({ statusCode: 500, statusMessage: 'Stored cleaning data could not be read' })
  }
}

async function writeState(state: CleaningState, log: RequestLogger) {
  const payload = JSON.stringify(state)
  try {
    await db.insert(cleaningState).values({ id: STATE_ID, payload, updatedAt: Date.now() }).onConflictDoUpdate({ target: cleaningState.id, set: { payload, updatedAt: Date.now() } })
  } catch (cause) { databaseError(cause, 'write', log) }
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
