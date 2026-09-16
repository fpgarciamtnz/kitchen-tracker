import { createError, readBody } from 'h3'
import { parsePrepRequest, PrepInputError } from '../../shared/prep'
import { updatePrep } from '../utils/prep-state'
export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const raw: unknown = await readBody(event)
  try {
    const request = parsePrepRequest(raw)
    log.set({ action: `prep_${request.command.type}`, storage: 'd1' })
    return await updatePrep(request, log)
  } catch (cause) {
    if (cause instanceof PrepInputError)
      throw createError({ statusCode: 400, statusMessage: cause.message })
    throw cause
  }
})
