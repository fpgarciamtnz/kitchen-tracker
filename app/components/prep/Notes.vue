<script setup lang="ts">
import type { PrepList } from '#shared/prep'
const props = defineProps<{ list: PrepList }>()
const emit = defineEmits<{ dirty: [value: boolean] }>()
const { t } = useI18n()
const prep = usePrep()
const draft = ref(props.list.notes)
// Saved notes the draft started from. Saving over newer notes takes a choice.
const base = ref(props.list.notes)
const dirty = computed(() => draft.value !== props.list.notes)
const changedElsewhere = computed(
  () => props.list.notes !== base.value && props.list.notes !== draft.value,
)
watch(dirty, (value) => emit('dirty', value), { immediate: true })
watch(
  () => props.list.notes,
  (next) => {
    if (draft.value === base.value) draft.value = base.value = next
  },
)
function useTheirs() {
  draft.value = base.value = props.list.notes
}
function keepMine() {
  base.value = props.list.notes
}
async function save() {
  const text = (draft.value = draft.value.trim())
  if (
    await prep.send({
      type: 'notes',
      listId: props.list.id,
      text,
      base: base.value,
    })
  )
    base.value = text
}
onBeforeRouteLeave(() => !dirty.value || window.confirm(t('prep.unsaved')))
</script>
<template>
  <form class="mt-8" @submit.prevent="save">
    <label for="prep-notes" class="text-base font-semibold">{{
      t('prep.notes')
    }}</label>
    <p id="notes-help" class="mt-1 text-sm leading-6 text-stone-500">
      {{ t('prep.notesHelp') }}
    </p>
    <textarea
      id="prep-notes"
      v-model="draft"
      rows="4"
      maxlength="10000"
      class="prep-input mt-3"
      aria-describedby="notes-help"
      :placeholder="t('prep.notesPlaceholder')"
    />
    <div
      v-if="changedElsewhere"
      class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
      role="status"
    >
      <p class="font-semibold">{{ t('prep.notesChanged') }}</p>
      <p class="mt-2 whitespace-pre-wrap break-words text-stone-600">
        {{ list.notes }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="prep-secondary" @click="useTheirs">
          {{ t('prep.useTheirs') }}
        </button>
        <button type="button" class="prep-secondary" @click="keepMine">
          {{ t('prep.keepMine') }}
        </button>
      </div>
    </div>
    <button
      class="prep-secondary mt-2"
      :disabled="!dirty || prep.blocked.value"
    >
      {{ t('prep.saveNotes') }}
    </button>
  </form>
</template>
