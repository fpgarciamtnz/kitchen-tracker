import { jsPDF } from 'jspdf'
import type { ReceiptLine } from '#shared/prep'

// Star PassPRNT transport adapted from /home/quico/prep-list/app/pages/index.vue.
export function receiptPdf(title: string, date: string, content: ReceiptLine[]) {
  const measure = new jsPDF({ unit: 'mm', format: [72, 240] })
  const rows: ReceiptLine[] = [{ text: title, kind: 'heading' }, { text: date, kind: 'note' }, ...content]
  const wrapped = rows.map(row => {
    measure.setFont('helvetica', row.kind === 'heading' ? 'bold' : 'normal')
    measure.setFontSize(row.kind === 'heading' ? 12 : 10)
    const lines: string[] = measure.splitTextToSize(row.text, row.kind === 'item' ? 58 : 64)
    return { ...row, lines }
  })
  const height = Math.min(240, Math.max(50, 15 + wrapped.reduce((sum, row) => sum + row.lines.length * 5 + 2, 0)))
  const orientation = height < 72 ? 'landscape' : 'portrait'
  const doc = new jsPDF({ unit: 'mm', format: [72, height], orientation })
  let y = 10
  for (const row of wrapped) {
    doc.setFont('helvetica', row.kind === 'heading' ? 'bold' : 'normal')
    doc.setFontSize(row.kind === 'heading' ? 12 : 10)
    for (let index = 0; index < row.lines.length; index++) {
      if (y > height - 6) { doc.addPage([72, height], orientation); y = 10 }
      if (row.kind === 'item' && index === 0) doc.rect(4, y - 3, 3, 3)
      doc.text(row.lines[index]!, row.kind === 'item' ? 10 : 4, y)
      y += 5
    }
    y += 2
  }
  return doc
}
export function starPrintUrl(pdf: string, callback: string) {
  return `starpassprnt://v1/print/nopreview?${new URLSearchParams({ pdf, size: '576', back: callback })}`
}
