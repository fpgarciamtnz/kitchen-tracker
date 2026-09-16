<script setup lang="ts">
import { Printer, Download } from '@lucide/vue'
import type { ReceiptLine } from '#shared/prep'
const props = defineProps<{
  title: string
  date: string
  lines: ReceiptLine[]
  disabled?: boolean
}>()
const { t } = useI18n()
const busy = ref(false)
const error = ref('')
const offeredHelp = ref(false)
async function print(download = false) {
  if (busy.value || props.disabled || !props.lines.length) return
  busy.value = true
  error.value = ''
  try {
    const { receiptPdf, starPrintUrl } = await import('~/utils/prep-print')
    const pdf = receiptPdf(props.title, props.date, props.lines)
    if (download) pdf.save(`${props.title}-${props.date}.pdf`)
    else {
      offeredHelp.value = true
      window.location.href = starPrintUrl(
        pdf.output('datauristring').split(',')[1]!,
        window.location.href,
      )
    }
  } catch {
    error.value = t('prep.printError')
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div>
    <div class="flex items-center gap-1">
      <button
        class="prep-secondary"
        :disabled="disabled || busy || !lines.length"
        @click="print()"
      >
        <Printer :size="17" aria-hidden="true" />{{ t('prep.print') }}
      </button>
      <button
        class="prep-icon"
        :disabled="disabled || busy || !lines.length"
        :aria-label="t('prep.download')"
        :title="t('prep.download')"
        @click="print(true)"
      >
        <Download :size="17" aria-hidden="true" />
      </button>
    </div>
    <p v-if="error" role="alert" class="mt-2 text-sm text-red-700">
      {{ error }}
    </p>
    <p v-if="offeredHelp" class="mt-2 text-xs text-stone-500">
      {{ t('prep.printHelp') }}
      <a
        href="https://apps.apple.com/app/star-passprnt/id979827520"
        target="_blank"
        rel="noopener noreferrer"
        class="underline"
        >Star PassPRNT</a
      >
    </p>
  </div>
</template>
