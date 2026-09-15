<script setup lang="ts">
import { ChefHat, ArrowRight } from '@lucide/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

const { verify } = useSession()
const pin = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  if (pin.value.length !== 4 || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await verify(pin.value)
    await navigateTo('/semanal')
  } catch {
    error.value = 'El PIN no es correcto. Vuelve a intentarlo.'
    pin.value = ''
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-6 py-12">
    <form class="w-full max-w-sm" @submit.prevent="submit">
      <div class="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><ChefHat :size="28" :stroke-width="1.5" /></div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Kitchen tracker</p>
      <h1 class="text-4xl font-semibold tracking-tight">Todo en su sitio.</h1>
      <p class="mt-4 text-base leading-7 text-stone-600">Introduce el PIN de la cocina para empezar.</p>
      <label for="pin" class="mt-10 block text-sm font-medium">PIN de acceso</label>
      <Input id="pin" v-model="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" aria-describedby="pin-error" class="mt-3 h-16 rounded-xl bg-white text-center text-2xl tracking-[0.6em]" @update:model-value="pin = String($event).replace(/\D/g, '')" />
      <p id="pin-error" class="mt-3 min-h-5 text-sm text-red-700" role="alert">{{ error }}</p>
      <Button class="mt-5 h-13 w-full rounded-xl text-base" :disabled="pin.length !== 4 || submitting">{{ submitting ? 'Comprobando…' : 'Entrar' }}<ArrowRight v-if="!submitting" aria-hidden="true" /></Button>
    </form>
  </main>
</template>
