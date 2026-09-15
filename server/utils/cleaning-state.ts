import { eq } from 'drizzle-orm'
import type { CleaningEvent, CleaningState } from '../../shared/cleaning'
import { cleaningTasks, createEmptyCleaningState, mergeCleaningState } from '../../shared/cleaning'
import { cleaningState } from '../db/schema'

const STATE_ID = 'default'

async function readState(): Promise<CleaningState> {
  const row = await db.select().from(cleaningState).where(eq(cleaningState.id, STATE_ID)).get()
  if (!row) return createEmptyCleaningState()
  try { return mergeCleaningState(JSON.parse(row.payload)) } catch { return createEmptyCleaningState() }
}

async function writeState(state: CleaningState) {
  const payload = JSON.stringify(state)
  await db.insert(cleaningState).values({ id: STATE_ID, payload, updatedAt: Date.now() }).onConflictDoUpdate({ target: cleaningState.id, set: { payload, updatedAt: Date.now() } })
}

export async function getCleaningState() { return readState() }

export async function completeCleaningTasks(taskIds: string[], by: string) {
  const state = await readState()
  const timestamp = new Date().toISOString()
  const events: CleaningEvent[] = []
  for (const taskId of taskIds) {
    if (!state.items[taskId]) continue
    const event: CleaningEvent = { id: crypto.randomUUID(), timestamp, by }
    state.items[taskId].history.push(event)
    const type = cleaningTasks.find(task => task.id === taskId)?.type
    if (!type) continue
    state.queue[type] = [...state.queue[type].filter(id => id !== taskId), taskId]
    events.push(event)
  }
  await writeState(state)
  return { state, events }
}

export async function undoCleaningEvents(eventIds: string[]) {
  const state = await readState()
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
  await writeState(state)
  return { state, undone }
}
