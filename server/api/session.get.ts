import { hasSession } from '../utils/session'
export default defineEventHandler(async (event) => {
  const authenticated = await hasSession(event)
  useLogger(event).set({ action: 'session_load', authenticated })
  return { authenticated }
})
