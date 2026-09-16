export interface PrepItem {
  id: string
  name: string
  ingredients: string[]
}
export interface PrepGroup {
  id: string
  name: string
  items: PrepItem[]
}
export interface PrepList {
  id: string
  date: string
  groups: PrepGroup[]
  selected: string[]
  completed: string[]
  notes: string
  manualOrder: string[]
}
export interface PrepState {
  revision: number
  menu: PrepGroup[]
  current: PrepList | null
}
export type PrepCommand =
  | { type: 'start'; date: string }
  | { type: 'select'; listId: string; ids: string[]; selected: boolean }
  | { type: 'complete'; listId: string; id: string; completed: boolean }
  | { type: 'notes'; listId: string; text: string }
  | { type: 'order'; listId: string; items: string[] }
  | { type: 'menu'; groups: PrepGroup[] }
export interface PrepRequest {
  revision: number
  command: PrepCommand
}
export class PrepInputError extends Error {}
export class PrepConflictError extends Error {}

export function emptyPrepState(): PrepState {
  return {
    revision: 0,
    menu: [{ id: 'generic', name: 'Generics', items: [] }],
    current: null,
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new PrepInputError('Invalid object')
  return value as Record<string, unknown>
}
function text(value: unknown, max = 200, empty = false): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (!empty && !value.trim())
  )
    throw new PrepInputError('Invalid text')
  return value.trim()
}
function strings(value: unknown, max = 500, length = 200): string[] {
  if (!Array.isArray(value) || value.length > max)
    throw new PrepInputError('Invalid list')
  return [...new Set(value.map((item) => text(item, length)))]
}
function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new PrepInputError('Invalid selection')
  return value
}
export function parseMenu(value: unknown): PrepGroup[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new PrepInputError('Invalid menu')
  const ids = new Set<string>()
  function id(value: unknown) {
    const result = text(value, 100)
    if (ids.has(result)) throw new PrepInputError('Duplicate ID')
    ids.add(result)
    return result
  }
  return value.map((raw) => {
    const group = record(raw)
    if (!Array.isArray(group.items) || group.items.length > 100)
      throw new PrepInputError('Invalid items')
    return {
      id: id(group.id),
      name: text(group.name),
      items: group.items.map((rawItem) => {
        const item = record(rawItem)
        return {
          id: id(item.id),
          name: text(item.name),
          ingredients: strings(item.ingredients, 100),
        }
      }),
    }
  })
}
export function parsePrepRequest(value: unknown): PrepRequest {
  const body = record(value)
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0)
    throw new PrepInputError('Invalid revision')
  const raw = record(body.command)
  let command: PrepCommand
  switch (raw.type) {
    case 'start': {
      const date = text(raw.date, 10)
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date
      )
        throw new PrepInputError('Invalid date')
      command = { type: 'start', date }
      break
    }
    case 'menu':
      command = { type: 'menu', groups: parseMenu(raw.groups) }
      break
    case 'select':
      command = {
        type: 'select',
        listId: text(raw.listId, 100),
        ids: strings(raw.ids, 1000, 100),
        selected: flag(raw.selected),
      }
      break
    case 'complete':
      command = {
        type: 'complete',
        listId: text(raw.listId, 100),
        id: text(raw.id, 100),
        completed: flag(raw.completed),
      }
      break
    case 'notes':
      command = {
        type: 'notes',
        listId: text(raw.listId, 100),
        text: text(raw.text, 10000, true),
      }
      break
    case 'order':
      command = {
        type: 'order',
        listId: text(raw.listId, 100),
        items: strings(raw.items, 500),
      }
      break
    default:
      throw new PrepInputError('Invalid action')
  }
  return { revision: Number(body.revision), command }
}

// Selected work is a snapshot: a catalog edit must not erase an already communicated task.
function syncCatalog(current: PrepList, menu: PrepGroup[]): PrepGroup[] {
  // Keep the current sheet's ordering. Catalog reordering takes effect with the next list.
  const groups: PrepGroup[] = []
  for (const old of current.groups) {
    const next = menu.find((group) => group.id === old.id)
    const items = old.items.flatMap((item) => {
      if (current.selected.includes(item.id)) return [item]
      const replacement = next?.items.find(
        (candidate) => candidate.id === item.id,
      )
      return replacement ? [replacement] : []
    })
    for (const item of next?.items || [])
      if (!items.some((candidate) => candidate.id === item.id)) items.push(item)
    if (next || items.length)
      groups.push({
        id: old.id,
        name: old.items.some((item) => current.selected.includes(item.id))
          ? old.name
          : next!.name,
        items,
      })
  }
  for (const group of menu)
    if (!groups.some((candidate) => candidate.id === group.id))
      groups.push(group)
  return groups
}

export function applyPrepCommand(
  input: PrepState,
  command: PrepCommand,
): PrepState {
  const state = structuredClone(input)
  if (command.type === 'start') {
    state.current = {
      id: crypto.randomUUID(),
      date: command.date,
      groups: structuredClone(state.menu),
      selected: [],
      completed: [],
      notes: '',
      manualOrder: [],
    }
  } else if (command.type === 'menu') {
    state.menu = structuredClone(command.groups)
    if (state.current)
      state.current.groups = syncCatalog(state.current, state.menu)
  } else {
    const list = state.current
    if (!list || list.id !== command.listId)
      throw new PrepConflictError('The current list has changed')
    if (command.type === 'select') {
      const validIds = new Set(
        list.groups.flatMap((group) => group.items.map((item) => item.id)),
      )
      if (command.ids.some((id) => !validIds.has(id)))
        throw new PrepInputError('Unknown item')
      list.selected = command.selected
        ? [...new Set([...list.selected, ...command.ids])]
        : list.selected.filter((id) => !command.ids.includes(id))
      list.completed = list.completed.filter((id) => list.selected.includes(id))
      list.groups = syncCatalog(list, state.menu)
    } else if (command.type === 'complete') {
      if (!list.selected.includes(command.id))
        throw new PrepInputError('Item is not selected')
      list.completed = command.completed
        ? [...new Set([...list.completed, command.id])]
        : list.completed.filter((id) => id !== command.id)
    } else if (command.type === 'notes') list.notes = command.text
    else if (command.type === 'order') list.manualOrder = command.items
  }
  state.revision += 1
  return state
}

export function selectedGroups(list: PrepList): PrepGroup[] {
  return list.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => list.selected.includes(item.id)),
    }))
    .filter((group) => group.items.length)
}
export interface OrderSuggestion {
  name: string
  sources: string[]
}
export function orderSuggestions(list: PrepList): OrderSuggestion[] {
  const result = new Map<string, OrderSuggestion>()
  for (const group of selectedGroups(list))
    for (const item of group.items)
      for (const ingredient of item.ingredients) {
        const key = ingredient.trim().toLocaleLowerCase('en')
        const line = result.get(key) || { name: ingredient.trim(), sources: [] }
        const source = `${group.name} · ${item.name}`
        if (!line.sources.includes(source)) line.sources.push(source)
        result.set(key, line)
      }
  return [...result.values()]
}
export interface ReceiptLine {
  text: string
  kind: 'heading' | 'item' | 'note'
}
export function prepReceipt(list: PrepList): ReceiptLine[] {
  const lines: ReceiptLine[] = selectedGroups(list).flatMap((group) => [
    { text: group.name, kind: 'heading' as const },
    ...group.items.map((item) => ({ text: item.name, kind: 'item' as const })),
  ])
  if (list.notes) lines.push({ text: list.notes, kind: 'note' })
  return lines
}
export function orderReceipt(list: PrepList): ReceiptLine[] {
  return [
    ...orderSuggestions(list).map((item) => item.name),
    ...list.manualOrder,
  ].map((text) => ({ text, kind: 'item' }))
}
