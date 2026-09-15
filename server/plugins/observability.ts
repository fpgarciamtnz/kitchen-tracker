import { log } from 'evlog'
import { clientLogFields } from '#shared/observability'

export default defineNitroPlugin((nitroApp) => {
  // evlog's built-in transport delivers to this hook. Re-emit only client events
  // through evlog's structured console output so Workers Logs retains them too.
  nitroApp.hooks.hook('evlog:drain', ({ event }) => {
    if (event.source !== 'client') return
    const fields = clientLogFields(event)
    if (event.level === 'error') log.error(fields)
    else if (event.level === 'warn') log.warn(fields)
    else if (event.level === 'info') log.info(fields)
  })
})
