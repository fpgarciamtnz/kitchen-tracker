import { toTaskViews } from '../../shared/cleaning'
import { getCleaningState } from '../utils/cleaning-state'
export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  log.set({ action: 'cleaning_load', storage: 'database' })
  const state = await getCleaningState(log)
  return { weekly: toTaskViews(state, 'weekly'), deep: toTaskViews(state, 'deep') }
})
