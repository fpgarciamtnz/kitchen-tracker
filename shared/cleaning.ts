export type CleaningType = 'weekly' | 'deep'

export type CleaningTask = {
  id: string
  title: string
  description?: string
  type: CleaningType
  order: number
}

export type CleaningEvent = { id: string; timestamp: string; by: string }
export type CleaningState = { version: 1; items: Record<string, { history: CleaningEvent[] }>; queue: Record<CleaningType, string[]> }
export type CleaningTaskView = CleaningTask & { history: CleaningEvent[]; lastCleanedAt?: string; lastCleanedBy?: string }

export const cleaningTasks: CleaningTask[] = [
  { id: 'inside-fridges', title: 'Interior de los frigoríficos', description: 'Saca los cajones. Limpia el suelo y las paredes, incluido el lateral interior de la puerta.', type: 'weekly', order: 1 },
  { id: 'plastic-boxes', title: 'Zona de cajas de plástico', description: 'Retira las cajas. Usa desengrasante, agua y jabón para limpiar la zona.', type: 'weekly', order: 2 },
  { id: 'oven-area', title: 'Zona exterior del horno', description: 'Retira los trastos y las tapas que sobren. Limpia el gastro y la parte superior del horno.', type: 'weekly', order: 3 },
  { id: 'storage', title: 'Secar, limpiar y ordenar almacén', description: 'Retira todo de la zona de la ventana. Limpia con agua y jabón y aparta lo que no se use.', type: 'weekly', order: 4 },
  { id: 'under-sink', title: 'Ordenar debajo del fregadero', description: 'Comprueba que todo esté seco y que cada cosa esté en su sitio.', type: 'weekly', order: 5 },
  { id: 'inside-extraction-bell', title: 'Interior de la campana', description: 'Retira la cubierta y aplica desengrasante en todas las zonas, también junto al tubo de extracción.', type: 'deep', order: 1 },
  { id: 'behind-fridges', title: 'Detrás de frigoríficos y congelador', description: 'Mueve los frigoríficos. Barre la zona y limpia los paneles negros y la suciedad acumulada.', type: 'deep', order: 2 },
  { id: 'inside-oven', title: 'Interior y puerta del horno', description: 'Retira las guías metálicas. Limpia paredes y suelo con agua y jabón y quita las migas de la puerta.', type: 'deep', order: 3 },
  { id: 'induction-stoves', title: 'Parte trasera y baja de inducción', description: 'Usa desengrasante para limpiar la zona del ventilador y la parte inferior. Limpia los filtros.', type: 'deep', order: 4 },
  { id: 'dishwasher', title: 'Puerta e interior del lavavajillas', description: 'Retira el agua, frota las paredes y limpia a mano bajo las piezas metálicas. Haz un ciclo y limpia la junta.', type: 'deep', order: 5 }
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
    empty.items[task.id] = { history: [...(raw.items[task.id]?.history || [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) }
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
