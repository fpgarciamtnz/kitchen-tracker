<script setup lang="ts">
defineProps<{ reload?: () => unknown }>()
const { t } = useI18n()
const prep = usePrep()
</script>
<template>
  <div
    v-if="prep.error.value"
    class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    role="alert"
  >
    <p>{{ prep.error.value }}</p>
    <button
      class="mt-2 min-h-10 font-semibold underline"
      @click="reload ? reload() : prep.refresh()"
    >
      {{ t('prep.reload') }}
    </button>
  </div>
  <p
    v-else-if="prep.loading.value"
    class="mb-4 text-sm text-stone-500"
    role="status"
  >
    {{ t('prep.loading') }}
  </p>
  <p class="sr-only" role="status">
    {{ prep.saving.value ? t('common.saving') : '' }}
  </p>
</template>
