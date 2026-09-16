<script setup lang="ts">
definePageMeta({ layout: 'cleaning' })
const cleaning = useCleaning()
await callOnce('cleaning-data', () => cleaning.refresh(), { mode: 'navigation' })
</script>

<template><CleaningPage /></template>
