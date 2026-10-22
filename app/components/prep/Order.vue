<script setup lang="ts">
import { ChevronRight, ShoppingCart } from '@lucide/vue'
import { orderLines } from '#shared/prep'
import type { PrepList } from '#shared/prep'
const props = defineProps<{ list: PrepList }>()
const { t } = useI18n()
const prep = usePrep()
const ordered = computed(() =>
  orderLines(props.list, prep.state.value?.products ?? []).filter(
    (line) => line.ordered,
  ),
)
</script>
<template>
  <NuxtLink
    to="/order"
    class="prep-card mt-8 flex min-h-16 items-center gap-4 px-4 py-4"
  >
    <ShoppingCart :size="20" class="shrink-0 text-accent" aria-hidden="true" />
    <span class="min-w-0 flex-1">
      <span class="block font-semibold">{{ t('order.title') }}</span>
      <span class="mt-1 line-clamp-2 break-words text-sm text-stone-500">{{
        ordered.length
          ? ordered.map((line) => line.name).join(' · ')
          : t('order.summaryEmpty')
      }}</span>
    </span>
    <span class="text-sm tabular-nums text-stone-400">{{ ordered.length }}</span>
    <ChevronRight :size="18" class="shrink-0 text-stone-400" aria-hidden="true" />
  </NuxtLink>
</template>
