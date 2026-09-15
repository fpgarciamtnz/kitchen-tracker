import { createError, readBody } from 'h3'
import { createSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ pin?: string }>(event)
  const config = useRuntimeConfig(event)
  if (body?.pin !== String(config.cleaningPin)) throw createError({ statusCode: 401, statusMessage: 'PIN incorrecto' })
  await createSession(event)
  return { authenticated: true }
})
