export type RecipeSection = 'ingredients' | 'steps'
export type RecipeCategory = 'current' | 'other' | 'old'

export interface RecipeLine { id: string; text: string; section: RecipeSection; position: number }
export interface RecipeImage { id: string; slot: 1 | 2; mimeType: string; imageData: string; width: number; height: number }
export interface Recipe {
  id: string; kitchenId: string; itemId: string | null; itemName: string; dishName: string
  name: string; revision: number; createdAt: number; updatedAt: number
  ingredients: RecipeLine[]; steps: RecipeLine[]; images: RecipeImage[]; category?: RecipeCategory
}
export interface RecipeMenuItem { id: string; name: string; recipe?: Recipe }
export interface RecipeMenuDish { id: string; name: string; items: RecipeMenuItem[] }
export interface RecipeLibrary { current: RecipeMenuDish[]; other: Recipe[]; old: Recipe[] }
export interface RecipeChunk { id: string; text: string; section: RecipeSection | 'unresolved'; position: number }

export function nameKey(name: string) { return name.trim().toLocaleLowerCase().replace(/\s+/g, ' ') }
export function classifyRecipe(recipe: Pick<Recipe, 'itemId'>, liveItemIds: Set<string>): RecipeCategory {
  if (!recipe.itemId) return 'other'
  return liveItemIds.has(recipe.itemId) ? 'current' : 'old'
}
export function parseRecipeChunks(source: string): RecipeChunk[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const chunks: RecipeChunk[] = []
  for (const raw of lines) {
    const text = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()
    if (!text) continue
    chunks.push({ id: crypto.randomUUID(), text, section: 'unresolved', position: chunks.length })
  }
  if (!chunks.length && source.trim()) chunks.push({ id: crypto.randomUUID(), text: source.trim(), section: 'unresolved', position: 0 })
  return chunks
}
export function arrangeChunks(chunks: RecipeChunk[], section: RecipeSection): RecipeChunk[] {
  return chunks.filter(chunk => chunk.section === section).map((chunk, position) => ({ ...chunk, position }))
}
export function recipeText(recipe: Pick<Recipe, 'name' | 'ingredients' | 'steps'>): string {
  const lines = [recipe.name, '', 'Ingredients', ...recipe.ingredients.map(line => `- ${line.text}`), '', 'Steps', ...recipe.steps.map((line, i) => `${i + 1}. ${line.text}`)]
  return lines.join('\n')
}
export function validateRecipeText(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Recipe text must be a string')
  return value
}
