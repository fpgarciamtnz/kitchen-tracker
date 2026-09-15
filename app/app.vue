<script setup lang="ts">
const session = useSession()
await callOnce('session', () => session.refresh())
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout><NuxtPage /></NuxtLayout>
</template>
