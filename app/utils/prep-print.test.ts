import { describe, expect, it } from 'vitest'
import { receiptPdf, starPrintUrl } from './prep-print'
describe('Star receipt printing', () => {
  it('keeps short receipts compact without rotating the 72 mm width', () => {
    const doc = receiptPdf('Prep list', '2026-09-17', [{ kind: 'item', text: 'Cut lettuce' }])
    expect(doc.internal.pageSize.getWidth()).toBe(72)
    expect(doc.internal.pageSize.getHeight()).toBeLessThan(100)
    expect(doc.getNumberOfPages()).toBe(1)
  })
  it('wraps and paginates long instructions without losing the final text', () => {
    const doc = receiptPdf('Prep list', '2026-09-17', [
      {
        kind: 'note',
        text:
          'A long kitchen instruction that must be communicated. '.repeat(300) +
          'FINAL_INSTRUCTION',
      },
    ])
    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
    expect(doc.internal.pageSize.getWidth()).toBe(72)
    expect(doc.output()).toContain('FINAL_INSTRUCTION')
  })
  it('encodes PDF and callback without changing transport content', () => {
    const url = new URL(
      starPrintUrl('a+/=b', 'https://example.test/prep/create?edit=1'),
    )
    expect(url.protocol).toBe('starpassprnt:')
    expect(url.pathname).toBe('/print/nopreview')
    expect(url.searchParams.get('pdf')).toBe('a+/=b')
    expect(url.searchParams.get('size')).toBe('576')
    expect(url.searchParams.get('back')).toBe(
      'https://example.test/prep/create?edit=1',
    )
  })
})
