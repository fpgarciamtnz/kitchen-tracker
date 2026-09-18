import { describe, expect, it } from 'vitest'
import { recipePdf, recipeReceiptLines } from './recipe-print'
describe('recipe printing', () => {
  const recipe = { name: 'Sauce', ingredients: [{ text: 'tomatoes' }], steps: [{ text: 'Roast' }] }
  it('keeps every ingredient and step in order', () => { expect(recipeReceiptLines(recipe as any)).toEqual(['Sauce', '', 'Ingredients', '- tomatoes', '', 'Steps', '1. Roast']) })
  it('wraps long text without ellipses', () => { const doc = recipePdf({ ...recipe, steps: [{ text: 'LONG_FINAL_' + 'x'.repeat(10000) }] } as any); expect(doc.getNumberOfPages()).toBeGreaterThan(1); expect(doc.output()).toContain('LONG_FINAL_') })
})
