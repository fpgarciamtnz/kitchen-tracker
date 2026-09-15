import type { CleaningTaskView } from '#shared/cleaning'

type CleaningResponse = { weekly: CleaningTaskView[], deep: CleaningTaskView[] }
type CompletionResponse = CleaningResponse & { events: { id: string }[] }

export function useCleaning() {
  const data = useState<CleaningResponse | null>('cleaning-data', () => null)
  const selected = useState<string[]>('cleaning-selected', () => [])
  const saving = useState('cleaning-saving', () => false)
  const loading = useState('cleaning-loading', () => false)
  const error = useState<string | null>('cleaning-error', () => null)
  const undoEvents = useState<string[]>('cleaning-undo-events', () => [])
  const requestFetch = useRequestFetch()

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      data.value = await requestFetch<CleaningResponse>('/api/cleaning')
    } catch {
      error.value = 'No se ha podido cargar la lista. Inténtalo de nuevo.'
    } finally {
      loading.value = false
    }
  }

  function toggle(taskId: string) {
    selected.value = selected.value.includes(taskId)
      ? selected.value.filter(id => id !== taskId)
      : [...selected.value, taskId]
  }

  function clearSelection() { selected.value = [] }

  async function complete(by: string) {
    if (!selected.value.length || saving.value) return false
    saving.value = true
    error.value = null
    try {
      const response = await $fetch<CompletionResponse>('/api/cleaning/complete', {
        method: 'POST', body: { taskIds: [...selected.value], by }
      })
      data.value = { weekly: response.weekly, deep: response.deep }
      undoEvents.value = response.events.map(event => event.id)
      clearSelection()
      return true
    } catch {
      error.value = 'No se ha guardado la limpieza. Tu selección sigue aquí para reintentar.'
      return false
    } finally {
      saving.value = false
    }
  }

  async function undo() {
    if (!undoEvents.value.length || saving.value) return false
    saving.value = true
    error.value = null
    try {
      const response = await $fetch<CleaningResponse>('/api/cleaning/undo', {
        method: 'POST', body: { eventIds: [...undoEvents.value] }
      })
      data.value = response
      undoEvents.value = []
      return true
    } catch {
      error.value = 'No se ha podido deshacer. Inténtalo de nuevo.'
      return false
    } finally {
      saving.value = false
    }
  }

  return { data, selected, saving, loading, error, undoEvents, refresh, toggle, clearSelection, complete, undo }
}
