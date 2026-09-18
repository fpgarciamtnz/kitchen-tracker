import { log } from 'evlog/client'
import { applyPrepCommand } from '#shared/prep'
import type { PrepState, PrepCommand } from '#shared/prep'
import { getFailureContext } from '#shared/observability'

export function usePrep() {
  const { t } = useI18n()
  const state = useState<PrepState | null>('prep-state', () => null)
  const saving = useState('prep-saving', () => false)
  const loading = useState('prep-loading', () => false)
  const error = useState('prep-error', () => '')
  const conflict = useState('prep-conflict', () => false)
  const persisted = useState<PrepState | null>('prep-persisted', () => null)
  type Pending = { command: PrepCommand; resolve: (saved: boolean) => void }
  // The queue is shared by every component using this composable. A single
  // revision stream prevents rapid checkbox changes from racing each other.
  const queue = useState<Pending[]>('prep-command-queue', () => [])
  const processing = useState('prep-processing', () => false)
  const request = useRequestFetch()
  async function refresh() {
    if (saving.value) return
    loading.value = true
    try {
      state.value = await request<PrepState>('/api/prep')
      persisted.value = structuredClone(state.value)
      error.value = ''
      conflict.value = false
    } catch (cause) {
      error.value = t('prep.loadError')
      log.error({ action: 'prep_load_failed', ...getFailureContext(cause) })
    } finally {
      loading.value = false
    }
  }
  async function processQueue() {
    if (processing.value || !queue.value.length || !persisted.value) return
    processing.value = true
    saving.value = true
    error.value = ''
    try {
      while (queue.value.length) {
        const pending = queue.value[0]!
        try {
          const next: PrepState = await $fetch<PrepState>('/api/prep', {
            method: 'POST',
            body: { revision: persisted.value!.revision, command: pending.command },
          })
          persisted.value = next
          queue.value.shift()
          pending.resolve(true)
          // Keep all commands visible while later requests are in flight.
          state.value = queue.value.reduce(
            (current, item) => applyPrepCommand(current, item.command),
            structuredClone(next),
          )
        } catch (cause) {
          const context = getFailureContext(cause)
          conflict.value = context.status === 409
          error.value = t(conflict.value ? 'prep.conflict' : 'prep.saveError')
          log.error({ action: 'prep_save_failed', ...context })
          state.value = structuredClone(persisted.value)
          for (const item of queue.value.splice(0)) item.resolve(false)
        }
      }
    } finally {
      processing.value = false
      saving.value = false
    }
  }
  function send(command: PrepCommand): Promise<boolean> {
    if (!state.value || conflict.value) return Promise.resolve(false)
    if (!persisted.value) persisted.value = structuredClone(state.value)
    try {
      state.value = applyPrepCommand(state.value, command)
    } catch {
      return Promise.resolve(false)
    }
    return new Promise((resolve) => {
      queue.value.push({ command, resolve })
      void processQueue()
    })
  }
  const blocked = computed(
    () => saving.value || loading.value || conflict.value,
  )
  const selectionBlocked = computed(() => loading.value || conflict.value)
  return {
    state,
    saving,
    loading,
    error,
    conflict,
    blocked,
    selectionBlocked,
    refresh,
    send,
  }
}
