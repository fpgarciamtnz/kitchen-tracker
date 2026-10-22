<script setup lang="ts">
import { ArrowLeft, Plus } from '@lucide/vue'
definePageMeta({ layout: 'cleaning' })
const { t } = useI18n()
const prep = usePrep()
await prep.refresh()
const current = computed(() => prep.state.value?.current)
</script>
<template>
  <main class="prep-page">
    <header class="mb-6">
      <NuxtLink
        to="/prep"
        class="mb-5 inline-flex min-h-10 items-center gap-2 text-sm text-stone-500"
        ><ArrowLeft :size="17" aria-hidden="true" />{{
          t('prep.view')
        }}</NuxtLink
      >
      <p class="prep-eyebrow">{{ t('prep.title') }}</p>
      <h1 class="prep-title mt-2">{{ t('prep.editList') }}</h1>
      <p v-if="current" class="mt-3 text-sm leading-6 text-stone-600">
        {{ t('prep.editHelp', { date: current.date }) }}
      </p>
    </header>
    <PrepStatus />
    <template v-if="prep.state.value">
      <section v-if="!current" class="prep-card p-7 text-center">
        <h2 class="text-lg font-semibold">{{ t('prep.emptyTitle') }}</h2>
        <NuxtLink to="/prep/create" class="prep-primary mt-5"
          ><Plus :size="18" aria-hidden="true" />{{ t('prep.create') }}</NuxtLink
        >
      </section>
      <template v-else>
        <p class="mb-5 text-sm text-stone-500">
          {{ t('prep.selected', { count: current.selected.length }) }}
        </p>
        <PrepEditor :list="current" />
        <PrepNotes :key="current.id" :list="current" />
        <PrepOrder v-if="!prep.state.value.draft" :list="current" />
        <NuxtLink to="/prep" class="prep-primary mt-6 w-full">{{
          t('prep.done')
        }}</NuxtLink>
      </template>
    </template>
  </main>
</template>
