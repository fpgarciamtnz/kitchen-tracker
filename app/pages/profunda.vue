<script setup lang="ts">
definePageMeta({ layout: 'cleaning' })
const cleaning = useCleaning()
await callOnce('cleaning-data', () => cleaning.refresh(), { mode: 'navigation' })
</script>
<template><CleaningPage type="deep" title="Limpieza profunda" eyebrow="Las zonas que requieren mover cosas y terminar la tarea" /></template>
