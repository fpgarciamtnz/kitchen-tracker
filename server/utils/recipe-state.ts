import { createError } from 'h3'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { recipes, recipeLines, recipeImages } from '../db/recipe-schema'
import { prepState } from '../db/prep-schema'
import { classifyRecipe, nameKey } from '../../shared/recipe'
import type { Recipe, RecipeCategory, RecipeLibrary, RecipeLine, RecipeImage } from '../../shared/recipe'

export const KITCHEN_ID = 'default'
const now = () => Date.now()
const id = () => crypto.randomUUID()

function menuItems() {
  return db.select({ document: prepState.document }).from(prepState).where(eq(prepState.id, 1)).get().then(row => {
    const menu = row ? (JSON.parse(row.document) as { menu?: Array<{ id: string; name: string; items: Array<{ id: string; name: string }> }> }).menu ?? [] : []
    return menu.flatMap(dish => dish.items.map(item => ({ ...item, dishId: dish.id, dishName: dish.name })))
  })
}

async function hydrate(rows: Array<typeof recipes.$inferSelect>): Promise<Recipe[]> {
  if (!rows.length) return []
  const ids = rows.map(row => row.id)
  const lines = await db.select().from(recipeLines).where(inArray(recipeLines.recipeId, ids)).orderBy(asc(recipeLines.position)).all()
  const images = await db.select().from(recipeImages).where(inArray(recipeImages.recipeId, ids)).orderBy(asc(recipeImages.slot)).all()
  return rows.map(row => {
    const toLine = (line: typeof recipeLines.$inferSelect): RecipeLine => ({ id: line.id, text: line.text, section: line.section as RecipeLine['section'], position: line.position })
    const toImage = (image: typeof recipeImages.$inferSelect): RecipeImage => ({ id: image.id, slot: image.slot as 1 | 2, mimeType: image.mimeType, imageData: image.imageData, width: image.width, height: image.height })
    return { id: row.id, kitchenId: row.kitchenId, itemId: row.itemId, itemName: row.itemNameSnapshot, dishName: row.dishNameSnapshot, name: row.name, revision: row.revision, createdAt: row.createdAt, updatedAt: row.updatedAt, ingredients: lines.filter(l => l.recipeId === row.id && l.section === 'ingredients').map(toLine), steps: lines.filter(l => l.recipeId === row.id && l.section === 'steps').map(toLine), images: images.filter(i => i.recipeId === row.id).map(toImage) }
  })
}

export async function listRecipes(): Promise<RecipeLibrary> {
  const rows = await db.select().from(recipes).where(eq(recipes.kitchenId, KITCHEN_ID)).orderBy(asc(recipes.createdAt)).all()
  const all = await hydrate(rows)
  const items = await menuItems()
  const live = new Set(items.map(item => item.id))
  const current: RecipeLibrary['current'] = []
  for (const dish of new Map(items.map(item => [item.dishId, { id: item.dishId, name: item.dishName, items: [] as RecipeLibrary['current'][number]['items'] }])).values()) {
    const dishItems = items.filter(item => item.dishId === dish.id)
    dish.items = dishItems.map(item => ({ id: item.id, name: item.name, recipe: all.find(recipe => recipe.itemId === item.id) })).filter(item => item.recipe)
    if (dish.items.length) current.push(dish)
  }
  const category = (recipe: Recipe): RecipeCategory => classifyRecipe(recipe, live)
  return { current, other: all.filter(recipe => category(recipe) === 'other'), old: all.filter(recipe => category(recipe) === 'old') }
}

export async function getRecipe(recipeId: string) {
  const row = await db.select().from(recipes).where(and(eq(recipes.id, recipeId), eq(recipes.kitchenId, KITCHEN_ID))).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
  return (await hydrate([row]))[0]!
}

function linesFor(recipe: Recipe, recipeId: string) {
  return [...recipe.ingredients, ...recipe.steps].map((line, position) => ({ id: line.id || id(), recipeId, section: line.section, position, text: line.text }))
}

export async function createRecipe(input: { name: string; itemId?: string | null; itemName?: string; dishName?: string; ingredients?: string[]; steps?: string[] }) {
  const stamp = now(); const recipeId = id(); const requested = input.name.trim(); if (!requested) throw createError({ statusCode: 400, statusMessage: 'Recipe name is required' })
  const item = input.itemId ? (await menuItems()).find(candidate => candidate.id === input.itemId) : undefined
  if (input.itemId && await db.select({ id: recipes.id }).from(recipes).where(and(eq(recipes.kitchenId, KITCHEN_ID), eq(recipes.itemId, input.itemId))).get()) throw createError({ statusCode: 409, statusMessage: 'This menu item already has a recipe.' })
  const base = { id: recipeId, kitchenId: KITCHEN_ID, itemId: input.itemId ?? null, itemNameSnapshot: item?.name ?? input.itemName?.trim() ?? '', dishNameSnapshot: item?.dishName ?? input.dishName?.trim() ?? '', name: requested, nameKey: nameKey(requested), revision: 1, createdAt: stamp, updatedAt: stamp }
  await db.transaction(async tx => {
    const existing = await tx.select().from(recipes).where(and(eq(recipes.kitchenId, KITCHEN_ID), eq(recipes.nameKey, base.nameKey))).orderBy(asc(recipes.createdAt)).all()
    if (existing.length) {
      let suffix = 1; let renamed = `${existing[0]!.name} (old recipe)`
      while (existing.some(row => row.nameKey === nameKey(renamed))) renamed = `${existing[0]!.name} (old recipe ${++suffix})`
      await tx.update(recipes).set({ name: renamed, nameKey: nameKey(renamed), updatedAt: stamp, revision: existing[0]!.revision + 1 }).where(eq(recipes.id, existing[0]!.id)).run()
    }
    await tx.insert(recipes).values(base).run()
    const lines = [...(input.ingredients ?? []).map((text, position) => ({ id: id(), recipeId, section: 'ingredients', position, text })), ...(input.steps ?? []).map((text, position) => ({ id: id(), recipeId, section: 'steps', position, text }))]
    if (lines.length) await tx.insert(recipeLines).values(lines).run()
  })
  return getRecipe(recipeId)
}

export async function updateRecipe(recipeId: string, input: { revision: number; name: string; itemId?: string | null; ingredients: string[]; steps: string[] }) {
  const current = await getRecipe(recipeId)
  if (current.revision !== input.revision) throw createError({ statusCode: 409, statusMessage: 'The recipe changed. Reload before trying again.' })
  const stamp = now(); const item = input.itemId ? (await menuItems()).find(candidate => candidate.id === input.itemId) : undefined
  await db.transaction(async tx => {
    const changed = await tx.update(recipes).set({ name: input.name.trim(), nameKey: nameKey(input.name), itemId: input.itemId ?? current.itemId, itemNameSnapshot: item?.name ?? current.itemName, dishNameSnapshot: item?.dishName ?? current.dishName, revision: current.revision + 1, updatedAt: stamp }).where(and(eq(recipes.id, recipeId), eq(recipes.revision, input.revision))).run()
    if (!changed.changes) throw createError({ statusCode: 409, statusMessage: 'The recipe changed. Reload before trying again.' })
    await tx.delete(recipeLines).where(eq(recipeLines.recipeId, recipeId)).run()
    const lines = [...input.ingredients.map((text, position) => ({ id: id(), recipeId, section: 'ingredients', position, text })), ...input.steps.map((text, position) => ({ id: id(), recipeId, section: 'steps', position, text }))]
    if (lines.length) await tx.insert(recipeLines).values(lines).run()
  })
  return getRecipe(recipeId)
}

export async function deleteRecipe(recipeId: string) { await db.delete(recipes).where(and(eq(recipes.id, recipeId), eq(recipes.kitchenId, KITCHEN_ID))).run() }
export async function rescueRecipe(recipeId: string, itemId: string) {
  const item = (await menuItems()).find(candidate => candidate.id === itemId); if (!item) throw createError({ statusCode: 400, statusMessage: 'Menu item not found' })
  if (await db.select({ id: recipes.id }).from(recipes).where(and(eq(recipes.kitchenId, KITCHEN_ID), eq(recipes.itemId, itemId))).get()) throw createError({ statusCode: 409, statusMessage: 'This menu item already has a recipe.' })
  const recipe = await getRecipe(recipeId)
  await db.update(recipes).set({ itemId, itemNameSnapshot: item.name, dishNameSnapshot: item.dishName, revision: recipe.revision + 1, updatedAt: now() }).where(and(eq(recipes.id, recipeId), eq(recipes.revision, recipe.revision))).run()
  return getRecipe(recipeId)
}

export async function addRecipeImage(recipeId: string, input: { slot: 1 | 2; mimeType: string; imageData: string; width: number; height: number }) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(input.mimeType) || !input.imageData.startsWith('data:')) throw createError({ statusCode: 400, statusMessage: 'Invalid image data' })
  if (input.imageData.length > 1_500_000) throw createError({ statusCode: 413, statusMessage: 'Image is too large' })
  await getRecipe(recipeId)
  await db.insert(recipeImages).values({ id: id(), recipeId, slot: input.slot, mimeType: input.mimeType, imageData: input.imageData, width: input.width, height: input.height, createdAt: now() }).onConflictDoUpdate({ target: [recipeImages.recipeId, recipeImages.slot], set: input }).run()
  return getRecipe(recipeId)
}
