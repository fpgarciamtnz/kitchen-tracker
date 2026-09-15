type SessionResponse = { authenticated: boolean }

export function useSession() {
  const authenticated = useState('session-authenticated', () => false)
  const loading = useState('session-loading', () => true)
  const requestFetch = useRequestFetch()

  async function refresh() {
    loading.value = true
    try {
      authenticated.value = (await requestFetch<SessionResponse>('/api/session')).authenticated
    } finally {
      loading.value = false
    }
  }

  async function verify(pin: string) {
    await $fetch('/api/session/verify', { method: 'POST', body: { pin } })
    authenticated.value = true
  }

  return { authenticated, loading, refresh, verify }
}
