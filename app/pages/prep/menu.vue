<script setup lang="ts">
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from '@lucide/vue'
import type { PrepGroup } from '#shared/prep'
definePageMeta({ layout: 'cleaning' })
const { t } = useI18n()
const prep = usePrep()
await prep.refresh()
const groups = ref<PrepGroup[]>(
  JSON.parse(JSON.stringify(prep.state.value?.menu || [])),
)
const baseline = ref(JSON.stringify(groups.value))
const dirty = computed(() => JSON.stringify(groups.value) !== baseline.value)
const open = ref('')
const saved = ref(false)
function addGroup() {
  const group = { id: crypto.randomUUID(), name: '', items: [] }
  groups.value.push(group)
  open.value = group.id
  saved.value = false
}
function addItem(group: PrepGroup) {
  group.items.push({ id: crypto.randomUUID(), name: '', ingredients: [] })
  saved.value = false
}
function move<T>(items: T[], index: number, delta: number) {
  const item = items.splice(index, 1)[0]!
  items.splice(index + delta, 0, item)
}
function removeGroup(index: number) {
  if (window.confirm(t('prep.removeGroup'))) groups.value.splice(index, 1)
}
async function reloadMenu() {
  if (dirty.value && !window.confirm(t('prep.unsaved'))) return
  await prep.refresh()
  if (!prep.error.value) {
    groups.value = JSON.parse(JSON.stringify(prep.state.value!.menu))
    baseline.value = JSON.stringify(groups.value)
    saved.value = false
  }
}
async function save() {
  if (await prep.send({ type: 'menu', groups: groups.value })) {
    groups.value = JSON.parse(JSON.stringify(prep.state.value!.menu))
    baseline.value = JSON.stringify(groups.value)
    saved.value = true
  }
}
// Keep the edited form on errors, including another person's concurrent menu edit.
onBeforeRouteLeave(() => !dirty.value || window.confirm(t('prep.unsaved')))
</script>
<template>
  <main class="prep-page">
    <header class="mb-6">
      <NuxtLink
        to="/prep/create?edit=1"
        class="mb-5 inline-flex min-h-10 items-center gap-2 text-sm text-stone-500"
        ><ArrowLeft :size="17" aria-hidden="true" />{{
          t('prep.backCreate')
        }}</NuxtLink
      >
      <p class="prep-eyebrow">{{ t('prep.title') }}</p>
      <h1 class="prep-title mt-2">{{ t('prep.editMenu') }}</h1>
      <p class="mt-3 text-sm leading-6 text-stone-500">
        {{ t('prep.menuHelp') }}
      </p>
    </header>
    <PrepStatus :reload="reloadMenu" />
    <form v-if="prep.state.value" class="space-y-4" @submit.prevent="save">
      <fieldset :disabled="prep.blocked.value" class="space-y-4">
        <section
          v-for="(group, index) in groups"
          :key="group.id"
          class="prep-card p-4"
        >
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="min-h-11 min-w-0 flex-1 text-left font-semibold break-words"
              :aria-expanded="open === group.id"
              @click="open = open === group.id ? '' : group.id"
            >
              {{ group.name || t('prep.newDish') }}</button
            ><button
              type="button"
              class="prep-icon"
              :disabled="index === 0"
              :aria-label="t('prep.moveUp', { name: group.name })"
              @click="move(groups, index, -1)"
            >
              <ArrowUp :size="16" /></button
            ><button
              type="button"
              class="prep-icon"
              :disabled="index === groups.length - 1"
              :aria-label="t('prep.moveDown', { name: group.name })"
              @click="move(groups, index, 1)"
            >
              <ArrowDown :size="16" /></button
            ><button
              type="button"
              class="prep-icon text-stone-400"
              :aria-label="t('prep.deleteGroup', { name: group.name })"
              @click="removeGroup(index)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
          <div v-show="open === group.id" class="mt-4 space-y-5">
            <div>
              <label :for="`name-${group.id}`" class="text-sm font-medium">{{
                t('prep.dishName')
              }}</label
              ><input
                :id="`name-${group.id}`"
                v-model="group.name"
                required
                maxlength="200"
                class="prep-input mt-2"
              />
            </div>
            <article
              v-for="(item, itemIndex) in group.items"
              :key="item.id"
              class="border-t border-stone-200 pt-4"
            >
              <div class="mb-2 flex items-center gap-1">
                <label
                  :for="`item-${item.id}`"
                  class="flex-1 text-sm font-medium"
                  >{{ t('prep.itemName') }}</label
                ><button
                  type="button"
                  class="prep-icon"
                  :disabled="itemIndex === 0"
                  :aria-label="t('prep.moveUp', { name: item.name })"
                  @click="move(group.items, itemIndex, -1)"
                >
                  <ArrowUp :size="15" /></button
                ><button
                  type="button"
                  class="prep-icon"
                  :disabled="itemIndex === group.items.length - 1"
                  :aria-label="t('prep.moveDown', { name: item.name })"
                  @click="move(group.items, itemIndex, 1)"
                >
                  <ArrowDown :size="15" /></button
                ><button
                  type="button"
                  class="prep-icon"
                  :aria-label="t('prep.deleteItem', { name: item.name })"
                  @click="group.items.splice(itemIndex, 1)"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
              <input
                :id="`item-${item.id}`"
                v-model="item.name"
                required
                maxlength="200"
                class="prep-input"
              />
              <label
                :for="`ingredients-${item.id}`"
                class="mt-4 block text-xs font-medium text-stone-600"
                >{{ t('prep.ingredients') }}</label
              >
              <textarea
                :id="`ingredients-${item.id}`"
                :value="item.ingredients.join('\n')"
                rows="3"
                maxlength="10000"
                class="prep-input mt-2 text-sm"
                :placeholder="t('prep.ingredientsPlaceholder')"
                @change="
                  item.ingredients = (
                    $event.target as HTMLTextAreaElement
                  ).value
                    .split('\n')
                    .map((value) => value.trim())
                    .filter(Boolean)
                "
              />
            </article>
            <button
              type="button"
              class="prep-secondary"
              @click="addItem(group)"
            >
              <Plus :size="16" />{{ t('prep.addItem') }}
            </button>
          </div>
        </section>
        <button
          type="button"
          class="prep-secondary w-full border-dashed"
          @click="addGroup"
        >
          <Plus :size="17" />{{ t('prep.addDish') }}
        </button>
      </fieldset>
      <div class="sticky bottom-28 rounded-xl bg-paper/95 py-3 backdrop-blur">
        <button
          class="prep-primary w-full"
          :disabled="!dirty || prep.blocked.value"
        >
          {{ prep.saving.value ? t('common.saving') : t('prep.saveMenu') }}
        </button>
        <p
          v-if="saved && !dirty"
          class="mt-2 text-center text-sm text-emerald-700"
          role="status"
        >
          {{ t('prep.menuSaved') }}
        </p>
      </div>
    </form>
  </main>
</template>
