import { createError, readBody } from 'h3'
import { toTaskViews } from '../../../shared/cleaning'
import { undoCleaningEvents } from '../../utils/cleaning-state'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  log.set({ action: 'cleaning_undo', storage: 'kv' })
  const body = await readBody<{ eventIds?: unknown }>(event)
  const eventIds = Array.isArray(body?.eventIds) && body.eventIds.every(id => typeof id === 'string')
    ? [...new Set(body.eventIds)]
    : []
  if (!eventIds.length) throw createError({ statusCode: 400, statusMessage: 'No events to undo' })
  log.set({ eventCount: eventIds.length })
  const result = await undoCleaningEvents(eventIds, log)
  log.set({ undoneCount: result.undone.length })
  return { weekly: toTaskViews(result.state, 'weekly'), deep: toTaskViews(result.state, 'deep') }
})
