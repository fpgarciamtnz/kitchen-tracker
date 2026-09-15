import { createError, readBody } from 'h3'
import { createSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  log.set({ action: 'session_verify' })
  const body = await readBody<{ pin?: string }>(event)
  const config = useRuntimeConfig(event)
  if (body?.pin !== String(config.cleaningPin)) throw createError({ statusCode: 401, statusMessage: 'Incorrect PIN' })
  await createSession(event)
  log.set({ authenticated: true })
  return { authenticated: true }
})
