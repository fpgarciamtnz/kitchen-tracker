import { log } from 'evlog/client'
import { getFailureContext } from '#shared/observability'

export default defineNuxtPlugin((nuxtApp) => {
  const seen = new WeakSet<object>()
  function report(action: string, cause: unknown) {
    if (cause && typeof cause === 'object') {
      if (seen.has(cause)) return
      seen.add(cause)
    }
    log.error({ action, path: window.location.pathname, ...getFailureContext(cause) })
  }

  nuxtApp.hook('vue:error', error => report('vue_error', error))
  nuxtApp.hook('app:error', error => report('app_error', error))
  nuxtApp.hook('app:mounted', () => log.info({ action: 'app_ready', path: window.location.pathname }))
  const onError = (event: ErrorEvent) => report('browser_error', event.error ?? new Error(event.message))
  const onRejection = (event: PromiseRejectionEvent) => report('unhandled_rejection', event.reason)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  if (import.meta.hot) import.meta.hot.dispose(() => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  })
})
