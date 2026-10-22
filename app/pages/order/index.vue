<script setup lang="ts">
import { Plus, Settings2, X } from '@lucide/vue'
import { orderLines, orderReceipt, workingPrepList } from '#shared/prep'
definePageMeta({ layout: 'cleaning' })
const { t } = useI18n()
const prep = usePrep()
await prep.refresh()
const list = computed(() =>
  prep.state.value ? workingPrepList(prep.state.value) : null,
)
const products = computed(() => prep.state.value?.products ?? [])
const lines = computed(() =>
  list.value ? orderLines(list.value, products.value) : [],
)
const history = usePrepHistory(() => list.value?.id)
const fromPrep = computed(() =>
  lines.value.filter((line) => line.section === 'prep'),
)
const catalog = computed(() =>
  products.value
    .map((group) => ({
      ...group,
      lines: lines.value.filter((line) => line.groupId === group.id),
    }))
    .filter((group) => group.lines.length),
)
const other = computed(() =>
  lines.value.filter((line) => line.section === 'other'),
)
const count = computed(() => lines.value.filter((line) => line.ordered).length)
const typed = ref('')
async function setOrdered(name: string, ordered: boolean) {
  return (
    !!list.value &&
    prep.send({ type: 'order', listId: list.value.id, names: [name], ordered })
  )
}
async function add() {
  const name = typed.value.trim()
  if (name && (await setOrdered(name, true))) typed.value = ''
}
</script>
<template>
  <main class="prep-page">
    <header class="mb-7">
      <p class="prep-eyebrow">{{ t('app.kitchen') }}</p>
      <div class="mt-2 flex items-center justify-between gap-3">
        <h1 class="prep-title">{{ t('order.title') }}</h1>
        <NuxtLink
          to="/order/products"
          class="prep-icon"
          :aria-label="t('order.manage')"
          :title="t('order.manage')"
          ><Settings2 :size="19" aria-hidden="true"
        /></NuxtLink>
      </div>
      <template v-if="list">
        <p class="mt-3 text-sm leading-6 text-stone-600">
          {{
            t(prep.state.value?.draft ? 'order.forDraft' : 'order.forCurrent', {
              date: list.date,
              count,
            })
          }}
        </p>
        <PrepPrint
          class="mt-4"
          :title="t('order.title')"
          :date="list.date"
          :lines="orderReceipt(list, products)"
          :disabled="prep.loading.value || prep.conflict.value"
        />
      </template>
    </header>
    <PrepStatus />
    <template v-if="prep.state.value">
      <section v-if="!list" class="prep-card p-7 text-center">
        <h2 class="text-lg font-semibold">{{ t('order.emptyTitle') }}</h2>
        <p class="mt-2 text-sm leading-6 text-stone-500">
          {{ t('order.emptyHelp') }}
        </p>
        <NuxtLink to="/prep/create" class="prep-primary mt-5"
          ><Plus :size="18" aria-hidden="true" />{{ t('prep.create') }}</NuxtLink
        >
      </section>
      <template v-else>
        <section>
          <h2 class="mb-3 text-sm font-semibold text-accent">
            {{ t('order.fromPrep') }}
          </h2>
          <OrderChecklist
            v-if="fromPrep.length"
            :list-id="list.id"
            :lines="fromPrep"
            :last="history.lastOrder"
          />
          <p v-else class="prep-card p-5 text-sm leading-6 text-stone-500">
            {{ t('order.noLinked') }}
            <NuxtLink to="/prep/menu" class="font-medium text-accent underline">{{
              t('order.linkProducts')
            }}</NuxtLink>
          </p>
        </section>
        <section v-for="group in catalog" :key="group.id" class="mt-8">
          <h2 class="mb-3 text-sm font-semibold text-accent">{{ group.name }}</h2>
          <OrderChecklist
            :list-id="list.id"
            :lines="group.lines"
            :last="history.lastOrder"
          />
        </section>
        <p v-if="!catalog.length" class="mt-8 text-sm leading-6 text-stone-500">
          {{ t('order.noProducts') }}
          <NuxtLink to="/order/products" class="font-medium text-accent underline">{{
            t('order.manage')
          }}</NuxtLink>
        </p>
        <section class="mt-8">
          <h2 class="mb-3 text-sm font-semibold text-accent">
            {{ t('order.other') }}
          </h2>
          <ul v-if="other.length" class="prep-card mb-3">
            <li
              v-for="line in other"
              :key="line.key"
              class="flex min-h-14 items-center gap-3 border-b border-stone-100 py-1 pl-4 pr-1 last:border-0"
            >
              <span class="min-w-0 flex-1 break-words font-medium">{{ line.name }}</span>
              <button
                type="button"
                class="prep-icon"
                :disabled="prep.selectionBlocked.value"
                :aria-label="t('order.remove', { name: line.name })"
                @click="setOrdered(line.name, false)"
              >
                <X :size="17" aria-hidden="true" />
              </button>
            </li>
          </ul>
          <form class="flex gap-2" @submit.prevent="add">
            <label for="order-add" class="sr-only">{{ t('order.addLabel') }}</label>
            <input
              id="order-add"
              v-model="typed"
              maxlength="200"
              autocomplete="off"
              class="prep-input"
              :placeholder="t('order.addPlaceholder')"
            />
            <button
              class="prep-secondary shrink-0"
              :disabled="!typed.trim() || prep.selectionBlocked.value"
            >
              <Plus :size="17" aria-hidden="true" />{{ t('order.add') }}
            </button>
          </form>
        </section>
      </template>
    </template>
  </main>
</template>
