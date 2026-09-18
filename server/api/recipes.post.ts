import { createError, readBody } from 'h3'
import { addRecipeImage, createRecipe, deleteRecipe, rescueRecipe, updateRecipe } from '../utils/recipe-state'
export default defineEventHandler(async event => {
  const body = await readBody<any>(event)
  try {
    if (body?.action === 'create') return createRecipe(body)
    if (body?.action === 'update') return updateRecipe(body.id, body)
    if (body?.action === 'delete') return deleteRecipe(body.id)
    if (body?.action === 'rescue') return rescueRecipe(body.id, body.itemId)
    if (body?.action === 'image') return addRecipeImage(body.id, body)
  } catch (error) { throw error }
  throw createError({ statusCode: 400, statusMessage: 'Unknown recipe action' })
})
