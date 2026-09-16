import { log } from 'evlog/client'
import type { PrepState, PrepCommand } from '#shared/prep'
import { getFailureContext } from '#shared/observability'

export function usePrep() {
  const { t } = useI18n()
  const state = useState<PrepState | null>('prep-state', () => null)
  const saving = useState('prep-saving', () => false)
  const loading = useState('prep-loading', () => false)
  const error = useState('prep-error', () => '')
  const conflict = useState('prep-conflict', () => false)
  const request = useRequestFetch()
  async function refresh() {
    if (saving.value) return
    loading.value = true
    try {
      state.value = await request<PrepState>('/api/prep')
      error.value = ''
      conflict.value = false
    } catch (cause) {
      error.value = t('prep.loadError')
      log.error({ action: 'prep_load_failed', ...getFailureContext(cause) })
    } finally {
      loading.value = false
    }
  }
  async function send(command: PrepCommand) {
    if (!state.value || saving.value || conflict.value) return false
    saving.value = true
    error.value = ''
    try {
      state.value = await $fetch<PrepState>('/api/prep', {
        method: 'POST',
        body: { revision: state.value.revision, command },
      })
      return true
    } catch (cause) {
      conflict.value = getFailureContext(cause).status === 409
      error.value = t(conflict.value ? 'prep.conflict' : 'prep.saveError')
      log.error({ action: 'prep_save_failed', ...getFailureContext(cause) })
      return false
    } finally {
      saving.value = false
    }
  }
  const blocked = computed(
    () => saving.value || loading.value || conflict.value,
  )
  return { state, saving, loading, error, conflict, blocked, refresh, send }
}
