<script setup lang="ts">
import { recipeText } from '#shared/recipe'
import { recipePdf } from '~/utils/recipe-print'
const route = useRoute(); const recipe = ref<any>(null); const error = ref(''); const copied = ref(false)
async function load() { try { recipe.value = await $fetch(`/api/recipes/${route.params.id}`) } catch { error.value = 'Recipe not found.' } }
await load()
async function copy() { await navigator.clipboard.writeText(recipeText(recipe.value)); copied.value = true; setTimeout(() => copied.value = false, 1200) }
function print() { recipePdf(recipe.value).save(`${recipe.value.name}.pdf`) }
async function remove() { if (!confirm('Delete this recipe?')) return; await $fetch('/api/recipes', { method: 'POST', body: { action: 'delete', id: recipe.value.id } }); await navigateTo('/recipes') }
</script>
<template>
  <main v-if="recipe" class="prep-page max-w-3xl"><header class="mb-7"><NuxtLink to="/recipes" class="text-sm text-stone-500">← Recipe book</NuxtLink><div class="mt-3 flex items-start justify-between gap-3"><div><p class="prep-eyebrow">{{ recipe.dishName || 'Recipe' }}</p><h1 class="prep-title mt-2">{{ recipe.name }}</h1><p v-if="recipe.itemName" class="mt-2 text-sm text-stone-500">{{ recipe.itemName }}</p></div><div class="flex gap-2"><button class="prep-secondary" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button><button class="prep-secondary" @click="print">Print</button><NuxtLink :to="`/recipes/${recipe.id}/edit`" class="prep-primary">Edit</NuxtLink></div></div></header><section class="prep-card p-5"><h2 class="text-lg font-semibold">Ingredients</h2><ul class="mt-3 list-disc space-y-2 pl-5"><li v-for="line in recipe.ingredients" :key="line.id" class="whitespace-pre-wrap break-words">{{ line.text }}</li></ul><h2 class="mt-8 text-lg font-semibold">Steps</h2><ol class="mt-3 list-decimal space-y-3 pl-5"><li v-for="line in recipe.steps" :key="line.id" class="whitespace-pre-wrap break-words">{{ line.text }}</li></ol><div v-if="recipe.images.length" class="mt-8 grid gap-3 sm:grid-cols-2"><img v-for="image in recipe.images" :key="image.id" :src="image.imageData" :alt="`${recipe.name} visual clue`" class="max-h-80 w-full rounded-xl object-contain bg-stone-50" /></div></section><button class="mt-5 text-sm text-red-700 underline" @click="remove">Delete recipe</button></main><main v-else class="prep-page"><p role="alert">{{ error }}</p></main>
</template>
