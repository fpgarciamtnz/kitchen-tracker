import { log } from 'evlog/client'
import { getFailureContext } from '#shared/observability'

type SessionResponse = { authenticated: boolean }

export function useSession() {
  const authenticated = useState('session-authenticated', () => false)
  const loading = useState('session-loading', () => true)
  const requestFetch = useRequestFetch()

  async function refresh() {
    loading.value = true
    try {
      authenticated.value = (await requestFetch<SessionResponse>('/api/session')).authenticated
    } catch (cause) {
      log.error({ action: 'session_load_failed', endpoint: '/api/session', ...getFailureContext(cause) })
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function verify(pin: string) {
    try {
      await $fetch('/api/session/verify', { method: 'POST', body: { pin } })
      authenticated.value = true
      log.info({ action: 'session_verified' })
    } catch (cause) {
      const context = getFailureContext(cause)
      log[context.status === 401 ? 'warn' : 'error']({ action: 'session_verify_failed', endpoint: '/api/session/verify', ...context })
      throw cause
    }
  }

  return { authenticated, loading, refresh, verify }
}
