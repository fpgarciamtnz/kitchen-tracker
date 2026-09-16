<script setup lang="ts">
import type { PrepList } from '#shared/prep'
const props = defineProps<{ list: PrepList }>()
const emit = defineEmits<{ dirty: [value: boolean] }>()
const { t } = useI18n()
const prep = usePrep()
const draft = ref(props.list.notes)
const dirty = computed(() => draft.value !== props.list.notes)
watch(dirty, (value) => emit('dirty', value), { immediate: true })
watch(
  () => props.list.notes,
  (next, previous) => {
    if (draft.value === previous) draft.value = next
  },
)
async function save() {
  if (
    await prep.send({ type: 'notes', listId: props.list.id, text: draft.value })
  )
    draft.value = prep.state.value!.current!.notes
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
    <button
      class="prep-secondary mt-2"
      :disabled="!dirty || prep.blocked.value"
    >
      {{ t('prep.saveNotes') }}
    </button>
  </form>
</template>
