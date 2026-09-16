<script setup lang="ts">
import { ListPlus, Sparkles, UserRound, ClipboardList } from '@lucide/vue'

const route = useRoute()
const { t } = useI18n()
const navigation = [
  { to: '/prep', label: 'nav.prep', icon: ClipboardList },
  { to: '/prep/create?edit=1', label: 'nav.createPrep', icon: ListPlus },
  { to: '/cleaning', label: 'nav.cleaning', icon: Sparkles },
  { to: '/profile', label: 'nav.profile', icon: UserRound }
]
function isActive(to: string) {
  return to.startsWith('/prep/create')
    ? route.path.startsWith('/prep/')
    : route.path === to
}
</script>

<template>
  <div class="min-h-screen bg-paper pb-28">
    <slot />
    <nav :aria-label="t('nav.label')" class="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/80 bg-white/95 px-4 pt-2 backdrop-blur">
      <div class="mx-auto grid max-w-xl grid-cols-4 gap-1">
        <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-item" :class="isActive(item.to) && 'nav-item-active'" :aria-current="isActive(item.to) ? 'page' : undefined">
          <span class="nav-icon"><component :is="item.icon" :size="22" :stroke-width="1.75" aria-hidden="true" /></span>
          <span>{{ t(item.label) }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.nav-item { @apply flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold text-stone-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent; }
.nav-icon { @apply flex h-8 w-16 items-center justify-center rounded-full transition-colors; }
.nav-item-active { @apply text-accent; }
.nav-item-active .nav-icon { @apply bg-accent-soft; }
</style>
