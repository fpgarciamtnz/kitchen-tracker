<script setup lang="ts">
definePageMeta({ layout: 'cleaning' })
const cleaning = useCleaning()
await callOnce('cleaning-data', () => cleaning.refresh(), { mode: 'navigation' })
</script>
<template><CleaningPage type="weekly" title="Limpieza semanal" eyebrow="Lo que está en contacto con el trabajo diario" /></template>
