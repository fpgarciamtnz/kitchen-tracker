import type { Recipe, RecipeLibrary } from '#shared/recipe'
export function useRecipes() {
  const library = useState<RecipeLibrary | null>('recipe-library', () => null)
  const loading = useState('recipe-loading', () => false)
  const error = useState('recipe-error', () => '')
  async function refresh() { loading.value = true; try { library.value = await $fetch<RecipeLibrary>('/api/recipes'); error.value = '' } catch { error.value = 'Could not load recipes.' } finally { loading.value = false } }
  async function save(body: Record<string, unknown>) { const result = await $fetch<Recipe>('/api/recipes', { method: 'POST', body }); await refresh(); return result }
  return { library, loading, error, refresh, save }
}
