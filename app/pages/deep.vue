<script setup lang="ts">
definePageMeta({ layout: 'cleaning' })
const cleaning = useCleaning()
const { t } = useI18n()
await callOnce('cleaning-data', () => cleaning.refresh(), { mode: 'navigation' })
</script>
<template><CleaningPage type="deep" :title="t('cleaning.deepTitle')" :eyebrow="t('cleaning.deepDescription')" /></template>
