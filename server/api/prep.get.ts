import { readPrep } from '../utils/prep-state'
export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  log.set({ action: 'prep_load', storage: 'd1' })
  return readPrep(log)
})
