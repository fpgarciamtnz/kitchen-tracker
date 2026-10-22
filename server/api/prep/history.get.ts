import { getQuery } from 'h3'
import { readPrepHistory } from '../../utils/prep-state'
export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  log.set({ action: 'prep_history', storage: 'd1' })
  const { exclude } = getQuery(event)
  return readPrepHistory(typeof exclude === 'string' ? exclude : '', log)
})
