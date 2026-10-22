<script setup lang="ts">
import { Printer, Download, Share2 } from '@lucide/vue'
import { receiptText } from '#shared/prep'
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
const copied = ref(false)
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
// Plain text for WhatsApp or any other app. Without a share sheet, copy it instead.
async function share() {
  if (props.disabled || !props.lines.length) return
  error.value = ''
  const text = receiptText(props.title, props.date, props.lines)
  try {
    if (navigator.share) await navigator.share({ text })
    else {
      await navigator.clipboard.writeText(text)
      copied.value = true
      window.setTimeout(() => (copied.value = false), 3000)
    }
  } catch (cause) {
    if ((cause as Error).name !== 'AbortError') error.value = t('prep.shareError')
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
        class="prep-secondary"
        :disabled="disabled || !lines.length"
        @click="share"
      >
        <Share2 :size="17" aria-hidden="true" />{{ t('prep.share') }}
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
    <p v-if="copied" role="status" class="mt-2 text-sm text-emerald-700">
      {{ t('prep.copied') }}
    </p>
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
