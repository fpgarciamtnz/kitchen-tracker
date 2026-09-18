import { jsPDF } from 'jspdf'
import type { Recipe } from '#shared/recipe'
export function recipeReceiptLines(recipe: Pick<Recipe, 'name' | 'ingredients' | 'steps'>): string[] {
  return [recipe.name, '', 'Ingredients', ...recipe.ingredients.map(line => `- ${line.text}`), '', 'Steps', ...recipe.steps.map((line, index) => `${index + 1}. ${line.text}`)]
}
export function recipePdf(recipe: Pick<Recipe, 'name' | 'ingredients' | 'steps'>) {
  const source = new jsPDF({ unit: 'mm', format: [72, 240] })
  const rows = recipeReceiptLines(recipe).flatMap(text => source.splitTextToSize(text, 64) as string[])
  const height = Math.max(50, Math.min(240, 12 + rows.length * 5 + 8))
  const doc = new jsPDF({ unit: 'mm', format: [72, height] }); let y = 10
  for (const text of rows) { if (y > height - 6) { doc.addPage([72, height]); y = 10 }; doc.text(text, 4, y); y += 5 }
  return doc
}
