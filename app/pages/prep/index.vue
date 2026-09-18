<script setup lang="ts">
import { Plus, Pencil } from '@lucide/vue'
import { selectedGroups, prepReceipt } from '#shared/prep'
definePageMeta({ layout: 'cleaning' })
const { t } = useI18n()
const prep = usePrep()
await prep.refresh()
const current = computed(() => prep.state.value?.current)
const groups = computed(() =>
  current.value ? selectedGroups(current.value) : [],
)
async function complete(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  const done = input.checked
  if (
    !current.value ||
    !(await prep.send({
      type: 'complete',
      listId: current.value.id,
      id,
      completed: done,
    }))
  )
    input.checked = !done
}
</script>
<template>
  <main class="prep-page">
    <header class="mb-7">
      <p class="prep-eyebrow">{{ t('app.kitchen') }}</p>
      <div class="mt-2 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3"><h1 class="prep-title">{{ t('prep.title') }}</h1><NuxtLink to="/recipes" class="prep-secondary min-h-9">Recipes</NuxtLink></div>
        <NuxtLink
          v-if="current"
          to="/prep/create?edit=1"
          class="prep-icon"
          :aria-label="t('prep.editList')"
          ><Pencil :size="19" aria-hidden="true"
        /></NuxtLink>
      </div>
      <div
        v-if="current"
        class="mt-4 flex flex-wrap items-center justify-between gap-3"
      >
        <p class="text-sm text-stone-500">{{ current.date }}</p>
        <PrepPrint
          :title="t('prep.title')"
          :date="current.date"
          :lines="prepReceipt(current)"
          :disabled="prep.loading.value || prep.conflict.value"
        />
      </div>
    </header>
    <PrepStatus />
    <template v-if="prep.state.value">
      <section v-if="!current" class="prep-card p-7 text-center">
        <h2 class="text-lg font-semibold">{{ t('prep.emptyTitle') }}</h2>
        <p class="mt-2 text-sm leading-6 text-stone-500">
          {{ t('prep.emptyHelp') }}
        </p>
        <NuxtLink to="/prep/create" class="prep-primary mt-5"
          ><Plus :size="18" aria-hidden="true" />{{
            t('prep.create')
          }}</NuxtLink
        >
      </section>
      <template v-else>
        <div class="space-y-5">
          <section v-for="group in groups" :key="group.id" class="prep-card">
            <h2
              class="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-accent"
            >
              {{ group.name }}
            </h2>
            <label
              v-for="item in group.items"
              :key="item.id"
              class="flex min-h-16 cursor-pointer items-center gap-4 border-b border-stone-100 px-4 py-4 last:border-0"
            >
              <input
                type="checkbox"
                class="prep-checkbox"
                :checked="current.completed.includes(item.id)"
                :disabled="prep.selectionBlocked.value"
                @change="complete(item.id, $event)"
              />
              <span
                class="break-words text-base font-medium"
                :class="
                  current.completed.includes(item.id) &&
                  'text-stone-400 line-through'
                "
                >{{ item.name }}</span
              >
            </label>
          </section>
        </div>
        <p v-if="!groups.length" class="prep-card p-6 text-sm text-stone-500">
          {{ t('prep.noTasks') }}
        </p>
        <section
          v-if="current.notes"
          class="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-5"
        >
          <h2 class="text-sm font-semibold text-stone-600">
            {{ t('prep.notes') }}
          </h2>
          <p class="mt-2 whitespace-pre-wrap break-words text-base leading-7">
            {{ current.notes }}
          </p>
        </section>
        <NuxtLink to="/prep/create" class="prep-secondary mt-6"
          ><Plus :size="17" aria-hidden="true" />{{
            t('prep.newList')
          }}</NuxtLink
        >
        <PrepOrder :key="current.id" :list="current" />
      </template>
    </template>
  </main>
</template>
