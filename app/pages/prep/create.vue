<script setup lang="ts">
import { ArrowLeft, Settings2 } from '@lucide/vue'
import { prepReceipt } from '#shared/prep'
import { localDate } from '#shared/prep-history'
definePageMeta({ layout: 'cleaning' })
const { t } = useI18n()
const route = useRoute()
const prep = usePrep()
await prep.refresh()
// Older links used ?edit=1 to change the published list.
if (route.query.edit === '1' && !prep.state.value?.draft && prep.state.value?.current)
  await navigateTo('/prep/edit', { replace: true })
const draft = computed(() => prep.state.value?.draft)
const current = computed(() => prep.state.value?.current)
const notesDirty = ref(false)
const busy = ref(false)
const date = ref(localDate())
async function run(action: () => Promise<unknown>) {
  if (busy.value) return
  busy.value = true
  try {
    await action()
  } finally {
    busy.value = false
  }
}
function start() {
  return run(() =>
    prep.send({ type: 'start', date: date.value, listId: crypto.randomUUID() }),
  )
}
function finalize() {
  return run(async () => {
    if (draft.value && (await prep.send({ type: 'finalize', listId: draft.value.id })))
      await navigateTo('/prep', { replace: true })
  })
}
function discard() {
  const list = draft.value
  if (!list || !window.confirm(t('prep.discardConfirm'))) return
  return run(() => prep.send({ type: 'discard', listId: list.id }))
}
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
      <h1 class="prep-title mt-2">
        {{ t('prep.create') }}
      </h1>
      <p v-if="draft" class="mt-3 text-sm leading-6 text-stone-600">
        {{ t(current ? 'prep.draftHelp' : 'prep.firstDraftHelp', { date: draft.date }) }}
      </p>
      <NuxtLink v-if="prep.state.value" to="/prep/menu" class="prep-secondary mt-4">
        <Settings2 :size="16" aria-hidden="true" />{{ t('prep.editMenu') }}
      </NuxtLink>
    </header>
    <PrepStatus />
    <template v-if="prep.state.value">
      <form v-if="!draft" class="prep-card p-6" @submit.prevent="start">
        <h2 class="text-lg font-semibold">{{ t('prep.freshTitle') }}</h2>
        <p class="mt-3 text-sm leading-6 text-stone-600">
          {{ current ? t('prep.replaceHelp') : t('prep.startHelp') }}
        </p>
        <label for="prep-date" class="mt-6 block text-sm font-semibold">{{
          t('prep.forDate')
        }}</label>
        <input
          id="prep-date"
          v-model="date"
          type="date"
          required
          class="prep-input mt-2"
        />
        <button
          class="prep-primary mt-6 w-full"
          :disabled="!date || prep.blocked.value || busy"
        >
          {{ busy ? t('common.saving') : t('prep.start') }}
        </button>
        <NuxtLink
          v-if="current"
          to="/prep"
          class="mt-3 flex min-h-11 items-center justify-center text-sm text-stone-500"
          >{{ t('prep.cancel') }}</NuxtLink
        >
      </form>
      <template v-else>
        <p class="mb-5 text-sm text-stone-500">
          {{ t('prep.selected', { count: draft.selected.length }) }}
        </p>
        <PrepEditor :list="draft" />
        <PrepNotes :key="draft.id" :list="draft" @dirty="notesDirty = $event" />
        <PrepOrder :list="draft" />
        <PrepPrint
          class="mt-6"
          :title="t('prep.title')"
          :date="draft.date"
          :lines="prepReceipt(draft)"
          :disabled="notesDirty || prep.loading.value || prep.conflict.value"
        />
        <div class="sticky bottom-28 mt-6 rounded-xl bg-paper/95 py-3 backdrop-blur">
          <button
            type="button"
            class="prep-primary w-full"
            :disabled="prep.blocked.value || busy"
            @click="finalize"
          >
            {{ t('prep.finalize') }}
          </button>
        </div>
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-center text-sm text-stone-500 disabled:opacity-40"
          :disabled="prep.blocked.value || busy"
          @click="discard"
        >
          {{ t('prep.discard') }}
        </button>
      </template>
    </template>
  </main>
</template>
