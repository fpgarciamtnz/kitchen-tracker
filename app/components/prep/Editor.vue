<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import type { PrepGroup, PrepList } from '#shared/prep'
const props = defineProps<{ list: PrepList }>()
const { t } = useI18n()
const prep = usePrep()
const history = usePrepHistory(() => props.list.id)
const open = ref('')
async function select(ids: string[], selected: boolean, event?: Event) {
  const saved = await prep.send({
    type: 'select',
    listId: props.list.id,
    ids,
    selected,
  })
  if (!saved && event) (event.target as HTMLInputElement).checked = !selected
}
function all(group: PrepGroup) {
  return (
    group.items.length > 0 &&
    group.items.every((item) => props.list.selected.includes(item.id))
  )
}
</script>
<template>
  <div class="space-y-3">
    <section
      v-for="group in list.groups"
      :key="group.id"
      class="prep-card"
      :class="open === group.id && 'border-accent/40 ring-1 ring-accent/10'"
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
              group.items.filter((item) => list.selected.includes(item.id))
                .length
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
              group.items.some((item) => list.selected.includes(item.id))
            "
            :disabled="!group.items.length || prep.selectionBlocked.value"
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
          :class="list.selected.includes(item.id) && 'bg-accent-soft/40'"
          ><input
            type="checkbox"
            class="prep-checkbox mt-0.5"
            :checked="list.selected.includes(item.id)"
            :disabled="prep.selectionBlocked.value"
            @change="
              select(
                [item.id],
                ($event.target as HTMLInputElement).checked,
                $event,
              )
            "
          /><span class="min-w-0 flex-1"
            ><span class="block break-words font-medium">{{ item.name }}</span
            ><span
              v-if="item.ingredients.length"
              class="mt-1 block break-words text-xs leading-5 text-stone-500"
              >{{ t('prep.linked') }} {{ item.ingredients.join(' · ') }}</span
            ></span
          ><span
            v-if="history.lastPrep(item.id)"
            class="shrink-0 pt-0.5 text-xs text-stone-400"
            >{{ history.lastPrep(item.id) }}</span
          ></label
        >
        <p v-if="!group.items.length" class="px-4 py-5 text-sm text-stone-500">
          {{ t('prep.noItems') }}
          <NuxtLink to="/prep/menu" class="font-medium text-accent underline">{{
            t('prep.editMenu')
          }}</NuxtLink>
        </p>
      </div>
      <p
        v-else-if="group.items.some((item) => list.selected.includes(item.id))"
        class="break-words border-t border-stone-100 px-4 py-3 text-xs leading-5 text-stone-500"
      >
        {{
          group.items
            .filter((item) => list.selected.includes(item.id))
            .map((item) => item.name)
            .join(' · ')
        }}
      </p>
    </section>
  </div>
</template>
