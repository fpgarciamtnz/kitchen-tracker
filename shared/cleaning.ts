export type CleaningType = 'weekly' | 'deep'

export type CleaningTask = {
  id: string
  type: CleaningType
  order: number
}

export type CleaningEvent = { id: string; timestamp: string; by: string }
export type CleaningState = { version: 1; items: Record<string, { history: CleaningEvent[] }>; queue: Record<CleaningType, string[]> }
export type CleaningTaskView = CleaningTask & { history: CleaningEvent[]; lastCleanedAt?: string; lastCleanedBy?: string }

export const cleaningTasks: CleaningTask[] = [
  { id: 'inside-fridges', type: 'weekly', order: 1 },
  { id: 'oven-area', type: 'weekly', order: 1 },
  { id: 'storage', type: 'weekly', order: 2 },
  { id: 'under-sink', type: 'weekly', order: 3 },
  { id: 'inside-hot-section', type: 'weekly', order: 4 },
  { id: 'plastic-boxes', type: 'weekly', order: 5 },
  { id: 'plates-shelf', type: 'weekly', order: 6 },
  { id: 'inside-extraction-bell', type: 'deep', order: 1 },
  { id: 'behind-fridges', type: 'deep', order: 2 },
  { id: 'inside-oven', type: 'deep', order: 3 },
  { id: 'induction-stoves', type: 'deep', order: 4 },
  { id: 'outside-extraction-hood', type: 'deep', order: 5 },
  { id: 'dishwasher', type: 'deep', order: 6 }
]

export function createEmptyCleaningState(): CleaningState {
  return {
    version: 1,
    items: Object.fromEntries(cleaningTasks.map(task => [task.id, { history: [] }])),
    queue: {
      weekly: cleaningTasks.filter(task => task.type === 'weekly').sort((a, b) => a.order - b.order).map(task => task.id),
      deep: cleaningTasks.filter(task => task.type === 'deep').sort((a, b) => a.order - b.order).map(task => task.id)
    }
  }
}

export function mergeCleaningState(raw?: Partial<CleaningState> | null): CleaningState {
  const empty = createEmptyCleaningState()
  if (!raw?.items) return empty
  for (const task of cleaningTasks) {
    empty.items[task.id] = { history: [...(raw.items[task.id]?.history || [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-2) }
  }

  const suppliedQueue = raw.queue || empty.queue
  for (const type of ['weekly', 'deep'] as const) {
    const expected = cleaningTasks.filter(task => task.type === type).map(task => task.id)
    const valid = suppliedQueue[type].filter(id => expected.includes(id))
    empty.queue[type] = [...new Set([...valid, ...expected.filter(id => !valid.includes(id))])]
  }
  return empty
}

export function toTaskViews(state: CleaningState, type: CleaningType): CleaningTaskView[] {
  const byId = new Map(cleaningTasks.map(task => [task.id, task]))
  return state.queue[type].map(id => {
    const task = byId.get(id)!
    const history = state.items[id]?.history || []
    const last = history[history.length - 1]
    return { ...task, history, lastCleanedAt: last?.timestamp, lastCleanedBy: last?.by }
  })
}
