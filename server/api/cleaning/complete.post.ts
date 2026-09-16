import { createError, readBody } from 'h3'
import { toTaskViews } from '../../../shared/cleaning'
import { completeCleaningTasks } from '../../utils/cleaning-state'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  log.set({ action: 'cleaning_complete', storage: 'kv' })
  const body = await readBody<{ taskIds?: unknown, by?: unknown }>(event)
  const taskIds = Array.isArray(body?.taskIds) && body.taskIds.every(id => typeof id === 'string')
    ? [...new Set(body.taskIds)]
    : []
  const by = typeof body?.by === 'string' ? body.by.trim() : ''
  if (!taskIds.length || by.length < 2 || by.length > 60) throw createError({ statusCode: 400, statusMessage: 'Tasks and name are required' })
  log.set({ taskCount: taskIds.length })
  const result = await completeCleaningTasks(taskIds, by, log)
  log.set({ completedCount: result.events.length })
  return { weekly: toTaskViews(result.state, 'weekly'), deep: toTaskViews(result.state, 'deep'), events: result.events }
})
