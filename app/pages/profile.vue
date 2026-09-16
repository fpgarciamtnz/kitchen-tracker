<script setup lang="ts">
import { UserRound, Check, ArrowRight } from '@lucide/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { log } from 'evlog/client'

definePageMeta({ layout: 'cleaning' })
const route = useRoute()
const { t } = useI18n()
const profile = useProfile()
const draft = ref(profile.name.value)
const saved = ref(false)
const error = ref('')
const setup = computed(() => route.query.setup === '1')

async function save() {
  try {
    profile.save(draft.value)
    log.info({ action: 'profile_saved' })
    error.value = ''
    saved.value = true
    if (setup.value) await navigateTo('/prep')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('profile.saveError')
  }
}
</script>

<template>
  <main class="mx-auto max-w-xl px-5 pb-10 pt-10 sm:px-8">
    <header class="mb-8">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{{ setup ? t('profile.setup') : t('nav.profile') }}</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">{{ setup ? t('profile.setupTitle') : t('profile.title') }}</h1>
      <p class="mt-4 max-w-md text-sm leading-6 text-stone-600">{{ t('profile.description') }}</p>
    </header>
    <form class="rounded-2xl border border-stone-200 bg-white p-6" @submit.prevent="save">
      <div class="mb-6 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><UserRound :size="24" :stroke-width="1.5" /></div>
      <label for="profile-name" class="text-sm font-medium">{{ t('profile.label') }}</label>
      <Input id="profile-name" v-model="draft" autocomplete="given-name" required minlength="2" maxlength="60" class="mt-3 h-12 rounded-xl" :placeholder="t('profile.placeholder')" aria-describedby="name-help" @update:model-value="saved = false" />
      <p id="name-help" class="mt-3 text-xs leading-5 text-stone-500">{{ t('profile.help') }}</p>
      <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <Button class="mt-6 h-12 rounded-xl px-5">{{ setup ? t('profile.start') : t('profile.save') }}<ArrowRight v-if="setup" aria-hidden="true" /></Button>
      <p v-if="saved" class="mt-4 flex items-center gap-2 text-sm text-emerald-700" role="status"><Check :size="16" />{{ t('profile.saved') }}</p>
    </form>
  </main>
</template>
