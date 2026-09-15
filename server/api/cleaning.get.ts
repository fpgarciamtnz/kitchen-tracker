import { toTaskViews } from '../../shared/cleaning'
import { getCleaningState } from '../utils/cleaning-state'
export default defineEventHandler(async () => {
  const state = await getCleaningState()
  return { weekly: toTaskViews(state, 'weekly'), deep: toTaskViews(state, 'deep') }
})
