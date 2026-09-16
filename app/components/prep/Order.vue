<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import type { PrepList } from '#shared/prep'
import { orderSuggestions, orderReceipt } from '#shared/prep'
const props = defineProps<{ list: PrepList }>()
const { t } = useI18n()
const prep = usePrep()
const expanded = ref(false)
const draft = ref(props.list.manualOrder.join('\n'))
const dirty = computed(() => draft.value !== props.list.manualOrder.join('\n'))
watch(
  () => props.list.manualOrder,
  (next, previous) => {
    if (draft.value === previous.join('\n')) draft.value = next.join('\n')
  },
)
const automatic = computed(() => orderSuggestions(props.list))
const count = computed(
  () => automatic.value.length + props.list.manualOrder.length,
)
async function save() {
  if (
    await prep.send({
      type: 'order',
      listId: props.list.id,
      items: draft.value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    })
  )
    draft.value = prep.state.value!.current!.manualOrder.join('\n')
}
onBeforeRouteLeave(() => !dirty.value || window.confirm(t('prep.unsaved')))
</script>
<template>
  <section class="mt-10 border-t border-stone-200 pt-4">
    <button
      class="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-1 text-left text-stone-600"
      :aria-expanded="expanded"
      aria-controls="order-content"
      @click="expanded = !expanded"
    >
      <span class="text-base font-semibold"
        >{{ t('prep.order') }}
        <span class="ml-2 text-sm font-normal text-stone-400">{{
          count
        }}</span></span
      >
      <ChevronDown
        :size="18"
        aria-hidden="true"
        :class="expanded && 'rotate-180'"
      />
    </button>
    <div v-if="expanded" id="order-content" class="mt-3 space-y-5">
      <p class="text-sm leading-6 text-stone-500">{{ t('prep.orderHelp') }}</p>
      <ul v-if="automatic.length" class="prep-card divide-y divide-stone-100">
        <li v-for="line in automatic" :key="line.name" class="px-4 py-3">
          <p class="font-medium break-words">{{ line.name }}</p>
          <p class="mt-1 text-xs leading-5 text-stone-500 break-words">
            {{ line.sources.join(' / ') }}
          </p>
        </li>
      </ul>
      <p v-else class="text-sm text-stone-500">{{ t('prep.noLinked') }}</p>
      <form @submit.prevent="save">
        <label for="manual-order" class="text-sm font-semibold">{{
          t('prep.manualOrder')
        }}</label>
        <p id="manual-order-help" class="mt-1 text-xs leading-5 text-stone-500">
          {{ t('prep.manualHelp') }}
        </p>
        <textarea
          id="manual-order"
          v-model="draft"
          rows="4"
          maxlength="10000"
          class="prep-input mt-2"
          aria-describedby="manual-order-help"
          :placeholder="t('prep.manualPlaceholder')"
        />
        <button
          class="prep-secondary mt-2"
          :disabled="!dirty || prep.blocked.value"
        >
          {{ t('prep.saveProducts') }}
        </button>
      </form>
      <PrepPrint
        :title="t('prep.order')"
        :date="list.date"
        :lines="orderReceipt(list)"
        :disabled="dirty || prep.blocked.value"
      />
    </div>
  </section>
</template>
