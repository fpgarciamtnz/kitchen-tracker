import { log } from 'evlog/client'
import { getFailureContext } from '#shared/observability'
import type { CleaningTaskView } from '#shared/cleaning'

type CleaningResponse = { weekly: CleaningTaskView[], deep: CleaningTaskView[] }
type CompletionResponse = CleaningResponse & { events: { id: string }[] }

export function useCleaning() {
  const { t } = useI18n()
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
    } catch (cause) {
      log.error({ action: 'cleaning_load_failed', endpoint: '/api/cleaning', ...getFailureContext(cause) })
      error.value = t('cleaning.loadError')
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
      log.info({ action: 'cleaning_saved', taskCount: response.events.length })
      clearSelection()
      return true
    } catch (cause) {
      log.error({ action: 'cleaning_save_failed', endpoint: '/api/cleaning/complete', taskCount: selected.value.length, ...getFailureContext(cause) })
      error.value = t('cleaning.saveError')
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
      log.info({ action: 'cleaning_undone', taskCount: undoEvents.value.length })
      undoEvents.value = []
      return true
    } catch (cause) {
      log.error({ action: 'cleaning_undo_failed', endpoint: '/api/cleaning/undo', ...getFailureContext(cause) })
      error.value = t('cleaning.undoError')
      return false
    } finally {
      saving.value = false
    }
  }

  return { data, selected, saving, loading, error, undoEvents, refresh, toggle, clearSelection, complete, undo }
}
