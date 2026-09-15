<script setup lang="ts">
import { ArrowLeft, CheckCircle2 } from '@lucide/vue'
import type { CleaningType } from '#shared/cleaning'
import { Button } from '~/components/ui/button'

const props = defineProps<{ type: CleaningType, title: string, eyebrow: string }>()
const cleaning = useCleaning()
const { data, selected, saving, loading, error } = cleaning
const profile = useProfile()
const showUndo = ref(false)
const tasks = computed(() => data.value?.[props.type] || [])
const selectedTasks = computed(() => tasks.value.filter(task => selected.value.includes(task.id)))

function isSelected(taskId: string) { return selected.value.includes(taskId) }

onMounted(async () => {
  if (!cleaning.data.value) await cleaning.refresh()
})
onBeforeUnmount(() => cleaning.clearSelection())

function formatRelative(value?: string) {
  if (!value) return ''
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Hace 1 día'
  return `Hace ${days} días`
}

async function complete() {
  if (profile.name.value.length < 2) return
  if (await cleaning.complete(profile.name.value)) {
    showUndo.value = true
    window.setTimeout(() => { showUndo.value = false }, 12000)
  }
}

async function undo() {
  await cleaning.undo()
  showUndo.value = false
}
</script>

<template>
  <main class="mx-auto max-w-xl px-5 pb-10 pt-10 sm:px-8">
    <header class="mb-8">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Cocina · {{ type === 'weekly' ? '01' : '02' }}</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">{{ title }}</h1>
      <p class="mt-4 max-w-md text-sm leading-6 text-stone-600">{{ eyebrow }}</p>
    </header>

    <div v-if="error" class="mb-4 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <span>{{ error }}</span>
      <button class="font-semibold underline" @click="cleaning.refresh">Reintentar</button>
    </div>

    <section aria-live="polite">
      <TransitionGroup name="cleaning-list" tag="div" class="relative space-y-3">
        <article v-for="task in tasks" :key="task.id" class="task-card" :class="isSelected(task.id) && 'task-card-selected'">
          <label class="flex cursor-pointer gap-4 p-5">
            <input type="checkbox" :checked="isSelected(task.id)" :aria-label="`Seleccionar ${task.title}`" class="task-checkbox mt-1" @change="cleaning.toggle(task.id)" />
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-start justify-between gap-3">
                <span class="text-lg font-semibold leading-tight text-ink">{{ task.title }}</span>
                <span v-if="task.lastCleanedAt" class="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500">{{ formatRelative(task.lastCleanedAt) }}</span>
              </span>
              <span v-if="task.description" class="mt-2 block text-sm leading-6 text-stone-600">{{ task.description }}</span>
              <span v-if="task.lastCleanedBy" class="mt-3 block text-xs font-medium text-stone-400">Última vez: {{ task.lastCleanedBy }}</span>
            </span>
          </label>
        </article>
      </TransitionGroup>
      <div v-if="!tasks.length && !loading" class="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-sm text-stone-500">No hay tareas todavía.</div>
      <div v-if="loading && !tasks.length" class="space-y-3" aria-label="Cargando tareas"><div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-2xl bg-white/70" /></div>
    </section>

    <Transition name="toast">
      <div v-if="showUndo" class="fixed inset-x-5 bottom-28 z-20 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl">
        <span>Tarea completada</span><Button variant="ghost" size="sm" class="text-accent-soft hover:bg-white/10 hover:text-white" @click="undo">Deshacer</Button>
      </div>
    </Transition>

    <Transition name="toolbar">
      <div v-if="selected.length" class="fixed inset-x-0 top-0 z-30 border-b border-stone-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
        <div class="mx-auto flex max-w-xl items-center justify-between gap-3">
          <Button variant="ghost" size="icon" aria-label="Cancelar selección" @click="cleaning.clearSelection"><ArrowLeft :size="20" /></Button>
          <span class="text-sm font-semibold text-ink">{{ selectedTasks.length }} seleccionada{{ selectedTasks.length === 1 ? '' : 's' }}</span>
          <Button :disabled="saving || profile.name.value.length < 2" @click="complete">{{ saving ? 'Guardando…' : 'Completar tarea' }}<CheckCircle2 :size="17" /></Button>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.task-checkbox { @apply h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-stone-300 bg-white transition checked:border-accent checked:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent; }
.task-checkbox:checked { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m3 8 3 3 7-7' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-position: center; background-repeat: no-repeat; }
.task-card { @apply overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_rgba(37,28,22,0.04)] transition; }
.task-card:hover { @apply -translate-y-0.5 shadow-card; }
.task-card-selected { @apply border-accent bg-accent-soft/40; }
.cleaning-list-enter-active, .cleaning-list-leave-active { transition: all .35s ease; }
.cleaning-list-enter-from, .cleaning-list-leave-to { opacity: 0; transform: translateY(-12px) scale(.98); }
.cleaning-list-leave-active { position: absolute; width: 100%; }
.toolbar-enter-active, .toolbar-leave-active, .toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toolbar-enter-from, .toolbar-leave-to, .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }
@media (prefers-reduced-motion: reduce) { .cleaning-list-enter-active, .cleaning-list-leave-active, .toolbar-enter-active, .toolbar-leave-active, .toast-enter-active, .toast-leave-active { transition: none; } }
</style>
