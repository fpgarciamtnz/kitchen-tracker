<script setup lang="ts">
import { recipeText } from '#shared/recipe'
const recipes = useRecipes(); await recipes.refresh()
const copied = ref('')
async function copy(recipe: any) { await navigator.clipboard.writeText(recipeText(recipe)); copied.value = recipe.id; setTimeout(() => copied.value = '', 1200) }
</script>
<template>
  <main class="prep-page max-w-3xl">
    <header class="mb-7 flex items-start justify-between gap-4"><div><p class="prep-eyebrow">Kitchen reference</p><h1 class="prep-title mt-2">Recipe book</h1><p class="mt-2 text-sm text-stone-500">Shared recipes for the whole kitchen.</p></div><NuxtLink to="/recipes/new" class="prep-primary">New recipe</NuxtLink></header>
    <p v-if="recipes.error.value" role="alert" class="mb-4 text-sm text-red-700">{{ recipes.error.value }}</p>
    <section class="space-y-6">
      <div v-if="recipes.library.value?.current.length" class="space-y-3"><h2 class="text-lg font-semibold">Current menu</h2><div v-for="dish in recipes.library.value.current" :key="dish.id" class="prep-card"><h3 class="border-b border-stone-100 px-4 py-3 font-semibold text-accent">{{ dish.name }}</h3><div v-for="item in dish.items" :key="item.id" class="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 last:border-0"><NuxtLink :to="`/recipes/${item.recipe!.id}`" class="font-medium underline-offset-2 hover:underline">{{ item.name }}</NuxtLink><button class="prep-secondary min-h-9" @click="copy(item.recipe)">{{ copied === item.recipe!.id ? 'Copied' : 'Copy' }}</button></div></div></div>
      <div><h2 class="mb-3 text-lg font-semibold">Other recipes</h2><div v-if="!recipes.library.value?.other.length" class="prep-card p-5 text-sm text-stone-500">No unattached recipes yet.</div><div v-else class="prep-card divide-y divide-stone-100"><div v-for="recipe in recipes.library.value.other" :key="recipe.id" class="flex items-center justify-between gap-3 px-4 py-3"><NuxtLink :to="`/recipes/${recipe.id}`" class="font-medium">{{ recipe.name }}</NuxtLink><button class="prep-secondary min-h-9" @click="copy(recipe)">{{ copied === recipe.id ? 'Copied' : 'Copy' }}</button></div></div></div>
      <div><h2 class="mb-3 text-lg font-semibold">Old recipes</h2><div v-if="!recipes.library.value?.old.length" class="prep-card p-5 text-sm text-stone-500">No old recipes.</div><div v-else class="prep-card divide-y divide-stone-100"><div v-for="recipe in recipes.library.value.old" :key="recipe.id" class="flex items-center justify-between gap-3 px-4 py-3"><NuxtLink :to="`/recipes/${recipe.id}`" class="font-medium">{{ recipe.name }}</NuxtLink><NuxtLink :to="`/recipes/${recipe.id}`" class="prep-secondary min-h-9">Rescue</NuxtLink></div></div></div>
    </section>
  </main>
</template>
