<script setup lang="ts">
import { ArrowLeft, CheckCircle2, ChevronDown } from '@lucide/vue'
import type { CleaningType } from '#shared/cleaning'
import { Button } from '~/components/ui/button'

const props = defineProps<{ type: CleaningType, title: string, eyebrow: string }>()
const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const isPrototype = import.meta.dev
const cleaning = useCleaning()
const { data, selected, saving, loading, error } = cleaning
const profile = useProfile()
const showUndo = ref(false)
const expandedTasks = ref<string[]>([])
const tasks = computed(() => data.value?.[props.type] || [])
const prototypeVariant = computed(() => ['a', 'b', 'c'].includes(String(route.query.variant)) ? String(route.query.variant) : 'a')
const selectedTasks = computed(() => tasks.value.filter(task => selected.value.includes(task.id)))

function isSelected(taskId: string) { return selected.value.includes(taskId) }
function hasDescription(taskId: string) { return te(`tasks.${taskId}.description`) }
function isExpanded(taskId: string) { return expandedTasks.value.includes(taskId) }
function toggleExpanded(taskId: string) {
  expandedTasks.value = isExpanded(taskId)
    ? expandedTasks.value.filter(id => id !== taskId)
    : [...expandedTasks.value, taskId]
}
function setPrototypeVariant(variant: string) { router.replace({ query: { ...route.query, variant } }) }

onMounted(async () => {
  if (!cleaning.data.value) await cleaning.refresh()
})
onBeforeUnmount(() => cleaning.clearSelection())

function formatDate(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
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
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{{ t('app.kitchen') }} · {{ type === 'weekly' ? '01' : '02' }}</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">{{ title }}</h1>
      <div class="mt-5 max-w-md rounded-xl bg-accent-soft/50 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{{ t('cleaning.howItWorks') }}</p>
        <p class="mt-1 text-sm leading-6 text-stone-700">{{ eyebrow }}</p>
      </div>
    </header>

    <div v-if="error" class="mb-4 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <span>{{ error }}</span>
      <button class="font-semibold underline" @click="cleaning.refresh">{{ t('common.retry') }}</button>
    </div>

    <section aria-live="polite">
      <TransitionGroup name="cleaning-list" tag="div" class="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_rgba(37,28,22,0.04)]">
        <article v-for="(task, index) in tasks" :key="task.id" class="task-row" :class="[isSelected(task.id) && 'task-row-selected', index < tasks.length - 1 && 'border-b border-stone-100', isPrototype && index === 0 && `next-task-${prototypeVariant}`]">
          <div class="flex items-start gap-4 px-4 py-4 sm:px-5">
            <span v-if="isPrototype && index === 0 && prototypeVariant === 'c'" class="next-step-number" aria-hidden="true">1</span>
            <input type="checkbox" :checked="isSelected(task.id)" :aria-label="t('cleaning.select', { task: t(`tasks.${task.id}.title`) })" class="task-checkbox mt-0.5" @change="cleaning.toggle(task.id)" />
            <div class="min-w-0 flex-1">
              <span v-if="isPrototype && index === 0 && prototypeVariant === 'b'" class="next-task-label">Next task</span>
              <button v-if="hasDescription(task.id)" type="button" class="flex w-full items-start justify-between gap-3 text-left" :aria-expanded="isExpanded(task.id)" :aria-controls="`description-${task.id}`" @click="toggleExpanded(task.id)">
                <span class="text-base font-semibold leading-tight text-ink">{{ t(`tasks.${task.id}.title`) }}</span>
                <ChevronDown :size="18" class="mt-0.5 shrink-0 text-stone-500 transition-transform" :class="isExpanded(task.id) && 'rotate-180'" aria-hidden="true" />
              </button>
              <span v-else class="block text-base font-semibold leading-tight text-ink">{{ t(`tasks.${task.id}.title`) }}</span>
              <p v-if="hasDescription(task.id) && isExpanded(task.id)" :id="`description-${task.id}`" class="mt-2 text-sm leading-6 text-stone-600">{{ t(`tasks.${task.id}.description`) }}</p>
              <span v-if="task.lastCleanedAt" class="mt-1.5 block text-xs text-stone-500">
                {{ t('cleaning.lastCleaned', { name: task.lastCleanedBy || t('cleaning.unknownPerson'), date: formatDate(task.lastCleanedAt) }) }}
              </span>
            </div>
          </div>
        </article>
      </TransitionGroup>
      <div v-if="isPrototype" class="prototype-switcher" aria-label="Highlight prototype variations">
        <span>Highlight prototype</span>
        <button v-for="variant in ['a', 'b', 'c']" :key="variant" type="button" :class="prototypeVariant === variant && 'active'" @click="setPrototypeVariant(variant)">{{ variant.toUpperCase() }}</button>
      </div>
      <div v-if="!tasks.length && !loading && !error" class="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-sm text-stone-500">{{ t('cleaning.empty') }}</div>
      <div v-if="loading && !tasks.length" class="space-y-3" :aria-label="t('cleaning.loading')"><div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-2xl bg-white/70" /></div>
    </section>

    <Transition name="toast">
      <div v-if="showUndo" class="fixed inset-x-5 bottom-28 z-20 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl">
        <span>{{ t('cleaning.completed') }}</span><Button variant="ghost" size="sm" class="text-accent-soft hover:bg-white/10 hover:text-white" @click="undo">{{ t('common.undo') }}</Button>
      </div>
    </Transition>

    <Transition name="toolbar">
      <div v-if="selected.length" class="fixed inset-x-0 top-0 z-30 border-b border-stone-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
        <div class="mx-auto flex max-w-xl items-center justify-between gap-3">
          <Button variant="ghost" size="icon" :aria-label="t('cleaning.cancel')" @click="cleaning.clearSelection"><ArrowLeft :size="20" /></Button>
          <span class="text-sm font-semibold text-ink">{{ t('cleaning.selected', { count: selectedTasks.length }) }}</span>
          <Button :disabled="saving || profile.name.value.length < 2" @click="complete">{{ saving ? t('common.saving') : t('cleaning.complete') }}<CheckCircle2 :size="17" /></Button>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.task-checkbox { @apply h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-stone-300 bg-white transition checked:border-accent checked:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent; }
.task-checkbox:checked { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m3 8 3 3 7-7' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-position: center; background-repeat: no-repeat; }
.task-row { @apply transition-colors; }
.task-row:hover { @apply bg-stone-50; }
.task-row-selected { @apply bg-accent-soft/40; }
.next-task-a { @apply border-l-4 border-accent bg-accent-soft/30; }
.next-task-b { @apply bg-stone-50; }
.next-task-c { @apply border-l-4 border-stone-300; }
.next-task-label { @apply mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-accent; }
.next-step-number { @apply mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white; }
.prototype-switcher { @apply mt-3 flex items-center justify-center gap-2 text-xs text-stone-500; }
.prototype-switcher button { @apply h-7 w-7 rounded-full border border-stone-300 font-semibold transition-colors; }
.prototype-switcher button.active { @apply border-ink bg-ink text-white; }
.cleaning-list-enter-active, .cleaning-list-leave-active { transition: all .35s ease; }
.cleaning-list-enter-from, .cleaning-list-leave-to { opacity: 0; transform: translateY(-12px) scale(.98); }
.cleaning-list-leave-active { position: absolute; width: 100%; }
.toolbar-enter-active, .toolbar-leave-active, .toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toolbar-enter-from, .toolbar-leave-to, .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }
@media (prefers-reduced-motion: reduce) { .cleaning-list-enter-active, .cleaning-list-leave-active, .toolbar-enter-active, .toolbar-leave-active, .toast-enter-active, .toast-leave-active { transition: none; } }
</style>
