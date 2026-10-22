<script setup lang="ts">
import type { OrderLine } from '#shared/prep'
const props = defineProps<{
  listId: string
  lines: OrderLine[]
  last: (key: string) => string
}>()
const prep = usePrep()
async function toggle(line: OrderLine, event: Event) {
  const input = event.target as HTMLInputElement
  const ordered = input.checked
  const saved = await prep.send({
    type: 'order',
    listId: props.listId,
    names: [line.name],
    ordered,
  })
  if (!saved) input.checked = !ordered
}
</script>
<template>
  <div class="prep-card">
    <label
      v-for="line in lines"
      :key="line.key"
      class="flex min-h-14 cursor-pointer items-start gap-4 border-b border-stone-100 px-4 py-3 last:border-0"
      :class="line.ordered && 'bg-accent-soft/40'"
      ><input
        type="checkbox"
        class="prep-checkbox mt-0.5"
        :checked="line.ordered"
        :disabled="prep.selectionBlocked.value"
        @change="toggle(line, $event)"
      /><span class="min-w-0 flex-1"
        ><span
          class="block break-words font-medium"
          :class="!line.ordered && 'text-stone-500'"
          >{{ line.name }}</span
        ><span
          v-if="line.sources.length"
          class="mt-1 block break-words text-xs leading-5 text-stone-500"
          >{{ line.sources.join(' / ') }}</span
        ></span
      ><span v-if="last(line.key)" class="shrink-0 pt-0.5 text-xs text-stone-400">{{
        last(line.key)
      }}</span></label
    >
  </div>
</template>
