import { getRecipe } from '../../utils/recipe-state'
export default defineEventHandler(event => getRecipe(getRouterParam(event, 'id')!))
