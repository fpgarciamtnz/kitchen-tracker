import { requireSession } from '../utils/session'
export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/api/cleaning') || event.path.startsWith('/api/prep') || event.path.startsWith('/api/recipes')) {
    await requireSession(event)
    setResponseHeader(event, 'Cache-Control', 'no-store')
  }
})
