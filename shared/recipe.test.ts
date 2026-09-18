import { describe, expect, it } from 'vitest'
import { arrangeChunks, classifyRecipe, nameKey, parseRecipeChunks, recipeText } from './recipe'

describe('recipe domain', () => {
  it('normalizes names and classifies current, other, and old recipes', () => {
    expect(nameKey('  Tomato   Sauce ')).toBe('tomato sauce')
    const live = new Set(['item-1'])
    expect(classifyRecipe({ itemId: 'item-1' }, live)).toBe('current')
    expect(classifyRecipe({ itemId: null }, live)).toBe('other')
    expect(classifyRecipe({ itemId: 'removed' }, live)).toBe('old')
  })
  it('splits list markers while preserving wording and allows arrangement', () => {
    const chunks = parseRecipeChunks('- 1 kg tomatoes\n2. Roast slowly\n\nSalt to taste')
    expect(chunks.map(c => c.text)).toEqual(['1 kg tomatoes', 'Roast slowly', 'Salt to taste'])
    chunks[0]!.section = 'ingredients'; chunks[1]!.section = 'steps'
    expect(arrangeChunks(chunks, 'ingredients')[0]!.text).toBe('1 kg tomatoes')
  })
  it('formats every line without truncating long text', () => {
    const long = 'x'.repeat(10000)
    expect(recipeText({ name: 'Sauce', ingredients: [{ id: 'i', text: long, section: 'ingredients', position: 0 }], steps: [] })).toContain(long)
  })
})
