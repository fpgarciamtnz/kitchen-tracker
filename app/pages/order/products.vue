<script setup lang="ts">
import { ArrowLeft, Plus, Trash2 } from '@lucide/vue'
import type { ProductGroup } from '#shared/prep'
definePageMeta({ layout: 'cleaning' })
const { t } = useI18n()
const prep = usePrep()
await prep.refresh()
// Products are edited as one line each, like the ingredients of a prep item.
type EditedGroup = { id: string; name: string; text: string }
function toEdited(products: ProductGroup[]): EditedGroup[] {
  return products.map((group) => ({
    id: group.id,
    name: group.name,
    text: group.products.join('\n'),
  }))
}
function toProducts(groups: EditedGroup[]): ProductGroup[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name.trim(),
    products: [
      ...new Set(
        group.text
          .split('\n')
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    ],
  }))
}
const base = ref<ProductGroup[]>(structuredClone(toRaw(prep.state.value?.products ?? [])))
const groups = ref(toEdited(base.value))
const dirty = computed(
  () => JSON.stringify(toProducts(groups.value)) !== JSON.stringify(base.value),
)
const saved = ref(false)
function reset() {
  base.value = structuredClone(toRaw(prep.state.value!.products))
  groups.value = toEdited(base.value)
}
function addGroup() {
  groups.value.push({ id: crypto.randomUUID(), name: '', text: '' })
  saved.value = false
}
function removeGroup(index: number) {
  if (window.confirm(t('order.removeGroup'))) groups.value.splice(index, 1)
}
async function reload() {
  if (dirty.value && !window.confirm(t('prep.unsaved'))) return
  await prep.refresh()
  if (!prep.error.value) {
    reset()
    saved.value = false
  }
}
async function save() {
  if (
    await prep.send({
      type: 'products',
      groups: toProducts(groups.value),
      base: base.value,
    })
  ) {
    reset()
    saved.value = true
  }
}
// Keep the edited form on errors, including another person's concurrent edit.
onBeforeRouteLeave(() => !dirty.value || window.confirm(t('prep.unsaved')))
</script>
<template>
  <main class="prep-page">
    <header class="mb-6">
      <NuxtLink
        to="/order"
        class="mb-5 inline-flex min-h-10 items-center gap-2 text-sm text-stone-500"
        ><ArrowLeft :size="17" aria-hidden="true" />{{ t('order.back') }}</NuxtLink
      >
      <p class="prep-eyebrow">{{ t('order.title') }}</p>
      <h1 class="prep-title mt-2">{{ t('order.manage') }}</h1>
      <p class="mt-3 text-sm leading-6 text-stone-500">
        {{ t('order.productsHelp') }}
      </p>
    </header>
    <PrepStatus :reload="reload" />
    <form v-if="prep.state.value" class="space-y-4" @submit.prevent="save">
      <fieldset :disabled="prep.blocked.value" class="space-y-4">
        <section
          v-for="(group, index) in groups"
          :key="group.id"
          class="prep-card space-y-4 p-4"
        >
          <div>
            <div class="flex items-center gap-1">
              <label
                :for="`group-${group.id}`"
                class="flex-1 text-sm font-medium"
                >{{ t('order.groupName') }}</label
              ><button
                type="button"
                class="prep-icon text-stone-400"
                :aria-label="t('order.deleteGroup', { name: group.name })"
                @click="removeGroup(index)"
              >
                <Trash2 :size="16" />
              </button>
            </div>
            <input
              :id="`group-${group.id}`"
              v-model="group.name"
              required
              maxlength="200"
              class="prep-input mt-2"
            />
          </div>
          <div>
            <label
              :for="`products-${group.id}`"
              class="block text-xs font-medium text-stone-600"
              >{{ t('order.groupProducts') }}</label
            >
            <textarea
              :id="`products-${group.id}`"
              v-model="group.text"
              rows="5"
              maxlength="20000"
              class="prep-input mt-2 text-sm"
              :placeholder="t('order.productsPlaceholder')"
            />
          </div>
        </section>
        <button
          type="button"
          class="prep-secondary w-full border-dashed"
          @click="addGroup"
        >
          <Plus :size="17" />{{ t('order.addGroup') }}
        </button>
      </fieldset>
      <div class="sticky bottom-28 rounded-xl bg-paper/95 py-3 backdrop-blur">
        <button class="prep-primary w-full" :disabled="!dirty || prep.blocked.value">
          {{ prep.saving.value ? t('common.saving') : t('order.save') }}
        </button>
        <p
          v-if="saved && !dirty"
          class="mt-2 text-center text-sm text-emerald-700"
          role="status"
        >
          {{ t('order.saved') }}
        </p>
      </div>
    </form>
  </main>
</template>
