<script setup lang="ts">
import { ChevronDown, ArrowLeft, Settings2 } from '@lucide/vue'
import { prepReceipt } from '#shared/prep'
import type { PrepGroup } from '#shared/prep'
definePageMeta({ layout: 'cleaning' })
const { t } = useI18n()
const route = useRoute()
const prep = usePrep()
await prep.refresh()
const active = ref(route.query.edit === '1')
const open = ref('')
const notesDirty = ref(false)
const current = computed(() => prep.state.value?.current)
const date = ref('')
onMounted(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  date.value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
})
async function start() {
  if (await prep.send({ type: 'start', date: date.value })) {
    active.value = true
    await navigateTo('/prep/create?edit=1', { replace: true })
  }
}
async function select(ids: string[], selected: boolean, event?: Event) {
  if (!current.value) return
  const saved = await prep.send({
    type: 'select',
    listId: current.value.id,
    ids,
    selected,
  })
  if (!saved && event) (event.target as HTMLInputElement).checked = !selected
}
function all(group: PrepGroup) {
  return (
    group.items.length > 0 &&
    group.items.every((item) => current.value?.selected.includes(item.id))
  )
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
        {{ active && current ? t('prep.choose') : t('prep.newList') }}
      </h1>
    </header>
    <PrepStatus />
    <template v-if="prep.state.value">
      <form
        v-if="!active || !current"
        class="prep-card p-6"
        @submit.prevent="start"
      >
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
          :disabled="!date || prep.blocked.value"
        >
          {{ current ? t('prep.replace') : t('prep.start') }}
        </button>
        <NuxtLink
          v-if="current"
          to="/prep"
          class="mt-3 flex min-h-11 items-center justify-center text-sm text-stone-500"
          >{{ t('prep.cancel') }}</NuxtLink
        >
      </form>
      <template v-else>
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-stone-500">
            {{ t('prep.selected', { count: current.selected.length }) }}
          </p>
          <NuxtLink to="/prep/menu" class="prep-secondary"
            ><Settings2 :size="16" aria-hidden="true" />{{
              t('prep.editMenu')
            }}</NuxtLink
          >
        </div>
        <div class="space-y-3">
          <section
            v-for="group in current.groups"
            :key="group.id"
            class="prep-card"
            :class="
              open === group.id && 'border-accent/40 ring-1 ring-accent/10'
            "
          >
            <div class="flex items-center gap-2 px-3">
              <button
                class="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 text-left"
                :aria-expanded="open === group.id"
                :aria-controls="`group-${group.id}`"
                @click="open = open === group.id ? '' : group.id"
              >
                <ChevronDown
                  :size="18"
                  class="shrink-0 text-stone-400"
                  :class="open === group.id && 'rotate-180'"
                  aria-hidden="true"
                /><span class="min-w-0 flex-1 break-words font-semibold">{{
                  group.name
                }}</span
                ><span class="text-xs tabular-nums text-stone-400"
                  >{{
                    group.items.filter((item) =>
                      current!.selected.includes(item.id),
                    ).length
                  }}/{{ group.items.length }}</span
                >
              </button>
              <label
                class="flex min-h-12 cursor-pointer items-center gap-2 px-2 text-xs text-stone-500"
                ><input
                  type="checkbox"
                  class="prep-checkbox"
                  :checked="all(group)"
                  :indeterminate="
                    !all(group) &&
                    group.items.some((item) =>
                      current!.selected.includes(item.id),
                    )
                  "
                  :disabled="!group.items.length || prep.blocked.value"
                  :aria-label="t('prep.selectAll', { name: group.name })"
                  @change="
                    select(
                      group.items.map((item) => item.id),
                      ($event.target as HTMLInputElement).checked,
                      $event,
                    )
                  "
                /><span>{{ t('prep.all') }}</span></label
              >
            </div>
            <div
              v-if="open === group.id"
              :id="`group-${group.id}`"
              class="border-t border-stone-100"
            >
              <label
                v-for="item in group.items"
                :key="item.id"
                class="flex min-h-16 cursor-pointer items-start gap-4 border-b border-stone-100 px-4 py-4 last:border-0"
                :class="
                  current.selected.includes(item.id) && 'bg-accent-soft/40'
                "
                ><input
                  type="checkbox"
                  class="prep-checkbox mt-0.5"
                  :checked="current.selected.includes(item.id)"
                  :disabled="prep.blocked.value"
                  @change="
                    select(
                      [item.id],
                      ($event.target as HTMLInputElement).checked,
                      $event,
                    )
                  "
                /><span class="min-w-0"
                  ><span class="block break-words font-medium">{{
                    item.name
                  }}</span
                  ><span
                    v-if="item.ingredients.length"
                    class="mt-1 block break-words text-xs leading-5 text-stone-500"
                    >{{ t('prep.linked') }}
                    {{ item.ingredients.join(' · ') }}</span
                  ></span
                ></label
              >
              <p
                v-if="!group.items.length"
                class="px-4 py-5 text-sm text-stone-500"
              >
                {{ t('prep.noItems') }}
                <NuxtLink
                  to="/prep/menu"
                  class="font-medium text-accent underline"
                  >{{ t('prep.editMenu') }}</NuxtLink
                >
              </p>
            </div>
            <p
              v-else-if="
                group.items.some((item) => current!.selected.includes(item.id))
              "
              class="border-t border-stone-100 px-4 py-3 text-xs leading-5 text-stone-500 break-words"
            >
              {{
                group.items
                  .filter((item) => current!.selected.includes(item.id))
                  .map((item) => item.name)
                  .join(' · ')
              }}
            </p>
          </section>
        </div>
        <PrepNotes
          :key="current.id"
          :list="current"
          @dirty="notesDirty = $event"
        />
        <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
          <NuxtLink to="/prep" class="prep-primary">{{
            t('prep.view')
          }}</NuxtLink
          ><PrepPrint
            :title="t('prep.title')"
            :date="current.date"
            :lines="prepReceipt(current)"
            :disabled="notesDirty || prep.blocked.value"
          />
        </div>
        <PrepOrder :key="current.id" :list="current" />
      </template>
    </template>
  </main>
</template>
