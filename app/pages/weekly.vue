<script setup lang="ts">
definePageMeta({ layout: 'cleaning' })
const cleaning = useCleaning()
const { t } = useI18n()
await callOnce('cleaning-data', () => cleaning.refresh(), { mode: 'navigation' })
</script>
<template><CleaningPage type="weekly" :title="t('cleaning.weeklyTitle')" :eyebrow="t('cleaning.weeklyDescription')" /></template>
