import { createError, useSession as useH3Session } from 'h3'
import type { H3Event } from 'h3'

function kitchenSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  return useH3Session<{ verified: boolean }>(event, {
    name: 'kitchen-tracker-session',
    password: config.sessionSecret,
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, sameSite: 'strict', secure: !import.meta.dev, path: '/' }
  })
}

export async function createSession(event: H3Event) {
  const session = await kitchenSession(event)
  await session.update({ verified: true })
}

export async function hasSession(event: H3Event) {
  const session = await kitchenSession(event)
  return session.data.verified === true
}

export async function requireSession(event: H3Event) {
  if (!await hasSession(event)) throw createError({ statusCode: 401, statusMessage: 'PIN required' })
}
