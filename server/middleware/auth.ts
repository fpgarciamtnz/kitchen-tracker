import { requireSession } from '../utils/session'
export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/api/cleaning')) {
    await requireSession(event)
    setResponseHeader(event, 'Cache-Control', 'no-store')
  }
})
