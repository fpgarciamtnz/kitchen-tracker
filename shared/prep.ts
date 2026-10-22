export interface PrepItem {
  id: string
  name: string
  /** Products this item needs. They go on the order list while it is selected. */
  ingredients: string[]
}
export interface PrepGroup {
  id: string
  name: string
  items: PrepItem[]
}
/** Products ordered independently of any prep item, such as oil or salt. */
export interface ProductGroup {
  id: string
  name: string
  products: string[]
}
export interface PrepList {
  id: string
  date: string
  groups: PrepGroup[]
  selected: string[]
  completed: string[]
  notes: string
  /** Products ordered beyond the selected prep: catalog products or typed names. */
  orderAdded: string[]
  /** Keys of linked products taken off the order. */
  orderRemoved: string[]
}
export interface PrepState {
  revision: number
  menu: PrepGroup[]
  products: ProductGroup[]
  /** Published list the kitchen works from. */
  current: PrepList | null
  /** Next list being prepared. It replaces current only on finalize. */
  draft: PrepList | null
}

/** Newest list: the one being prepared, otherwise the published one. Its order is the one to place. */
export function workingPrepList(state: PrepState): PrepList | null {
  return state.draft ?? state.current
}
// Whole-value edits carry the value they started from. Other commands apply
// to whatever the latest state is, so two phones rarely conflict.
export type PrepCommand =
  // The phone picks the new list's ID so ticks made before the server answers refer to it.
  | { type: 'start'; date: string; listId: string }
  | { type: 'finalize'; listId: string }
  | { type: 'discard'; listId: string }
  | { type: 'select'; listId: string; ids: string[]; selected: boolean }
  | { type: 'complete'; listId: string; id: string; completed: boolean }
  | { type: 'notes'; listId: string; text: string; base: string }
  | { type: 'order'; listId: string; names: string[]; ordered: boolean }
  | { type: 'menu'; groups: PrepGroup[]; base: PrepGroup[] }
  | { type: 'products'; groups: ProductGroup[]; base: ProductGroup[] }
export interface PrepRequest {
  revision: number
  command: PrepCommand
}
export class PrepInputError extends Error {}
export class PrepConflictError extends Error {}

const DEFAULT_PREP_MENU: PrepGroup[] = [
  {
    id: 'snaks',
    name: 'Snaks',
    items: [
      { id: 'snaks-olives', name: 'Olives', ingredients: [] },
      {
        id: 'snaks-butter-for-bread',
        name: 'Butter for bread',
        ingredients: [],
      },
      {
        id: 'snaks-compote-for-cheese',
        name: 'Compote for cheese',
        ingredients: [],
      },
      { id: 'snaks-charcuteria', name: 'Charcutería', ingredients: [] },
    ],
  },
  {
    id: 'ceasar-salad',
    name: 'Ceasar salad',
    items: [
      {
        id: 'ceasar-salad-slice-romane-salad',
        name: 'Slice Romane Salad',
        ingredients: [],
      },
      {
        id: 'ceasar-salad-caesar-dressing',
        name: 'Caesar dressing',
        ingredients: [],
      },
      { id: 'ceasar-salad-crutons', name: 'Crutons', ingredients: [] },
    ],
  },
  {
    id: 'vitelo-tonnato',
    name: 'Vitelo tonnato',
    items: [
      {
        id: 'vitelo-tonnato-slice-vitelo',
        name: 'Slice vitelo',
        ingredients: [],
      },
      {
        id: 'vitelo-tonnato-tuna-mayo',
        name: 'Tuna Mayo',
        ingredients: [],
      },
      { id: 'vitelo-tonnato-chives', name: 'Chives', ingredients: [] },
      { id: 'vitelo-tonnato-veal-jus', name: 'Veal jus', ingredients: [] },
      {
        id: 'vitelo-tonnato-make-vitelo',
        name: 'Make Vitelo',
        ingredients: [],
      },
    ],
  },
  {
    id: 'ragu',
    name: 'Ragú',
    items: [
      { id: 'ragu-ragu', name: 'Ragu', ingredients: [] },
      { id: 'ragu-parmesan', name: 'Parmesan', ingredients: [] },
      { id: 'ragu-butter-cubes', name: 'Butter cubes', ingredients: [] },
      { id: 'ragu-spinach-pack', name: 'Spinach pack', ingredients: [] },
    ],
  },
  {
    id: 'stracciaela',
    name: 'Stracciaela',
    items: [
      { id: 'stracciaela-item', name: 'Stracciaela', ingredients: [] },
      { id: 'stracciaela-herbs', name: 'Herbs', ingredients: [] },
      { id: 'stracciaela-zucchini', name: 'Zucchini', ingredients: [] },
    ],
  },
  {
    id: 'chanterelle-pasta',
    name: 'Chanterelle pasta',
    items: [
      {
        id: 'chanterelle-pasta-clean-mushrooms',
        name: 'Clean mushrooms',
        ingredients: [],
      },
      {
        id: 'chanterelle-pasta-miso-mushrooms-stock',
        name: 'Miso mushrooms stock',
        ingredients: [],
      },
      {
        id: 'chanterelle-pasta-parley',
        name: 'Parley',
        ingredients: [],
      },
      {
        id: 'chanterelle-pasta-cut-onion-for-pasta',
        name: 'Cut onion for pasta',
        ingredients: [],
      },
    ],
  },
  {
    id: 'cheesecake',
    name: 'Cheesecake',
    items: [
      { id: 'cheesecake-cheese-cake', name: 'Cheese cake', ingredients: [] },
      {
        id: 'cheesecake-blueberries-compot',
        name: 'Blueberries compot',
        ingredients: [],
      },
      {
        id: 'cheesecake-almond-crumble',
        name: 'Almond crumble',
        ingredients: [],
      },
    ],
  },
  {
    id: 'tomato-salad',
    name: 'Tomato salad',
    items: [
      { id: 'tomato-salad-tomatoes', name: 'Tomatoes', ingredients: [] },
      { id: 'tomato-salad-pesto', name: 'Pesto', ingredients: [] },
      {
        id: 'tomato-salad-roasted-pinenuts',
        name: 'Roasted Pinenuts',
        ingredients: [],
      },
      {
        id: 'tomato-salad-olives-capers-mix',
        name: 'Olives capers mix',
        ingredients: [],
      },
    ],
  },
  {
    id: 'oeuf-mayo',
    name: 'Oeuf Mayo',
    items: [
      { id: 'oeuf-mayo-boil-eggs', name: 'Boil eggs', ingredients: [] },
      { id: 'oeuf-mayo-safran-mayo', name: 'Safran mayo', ingredients: [] },
      {
        id: 'oeuf-mayo-yellow-caviar',
        name: 'Yellow caviar',
        ingredients: [],
      },
      {
        id: 'oeuf-mayo-pickled-carrots',
        name: 'Pickled Carrots',
        ingredients: [],
      },
    ],
  },
  {
    id: 'beef-tartare',
    name: 'Beef tartare',
    items: [
      {
        id: 'beef-tartare-cut-meet',
        name: 'Cut beef tartare meet',
        ingredients: [],
      },
      {
        id: 'beef-tartare-chopped-capers',
        name: 'Chopped capers',
        ingredients: [],
      },
      {
        id: 'beef-tartare-dice-onion',
        name: 'Dice onion for tartar',
        ingredients: [],
      },
      {
        id: 'beef-tartare-parley-terragon',
        name: 'Parley and terragon for tartar',
        ingredients: [],
      },
      {
        id: 'beef-tartare-pickled-mustard-seeds',
        name: 'Pickled mustard seeds',
        ingredients: [],
      },
      {
        id: 'beef-tartare-chips',
        name: 'Chips for tartar',
        ingredients: [],
      },
      {
        id: 'beef-tartare-egg-yolk',
        name: 'Egg yolk for tartar',
        ingredients: [],
      },
      {
        id: 'beef-tartare-pack-salad',
        name: 'Pack salad',
        ingredients: [],
      },
    ],
  },
]

const DEFAULT_PRODUCTS: ProductGroup[] = [
  { id: 'basics', name: 'Basics', products: [] },
]

export function emptyPrepState(): PrepState {
  return {
    revision: 0,
    menu: structuredClone(DEFAULT_PREP_MENU),
    products: structuredClone(DEFAULT_PRODUCTS),
    current: null,
    draft: null,
  }
}

type StoredPrepList = Omit<PrepList, 'orderAdded' | 'orderRemoved'> &
  Partial<Pick<PrepList, 'orderAdded' | 'orderRemoved'>> & {
    manualOrder?: string[]
  }
export type StoredPrepState = Omit<PrepState, 'products' | 'current' | 'draft'> & {
  products?: ProductGroup[]
  current: StoredPrepList | null
  draft?: StoredPrepList | null
}
function normalizeList(list: StoredPrepList | null | undefined): PrepList | null {
  if (!list) return null
  // Older lists kept typed order products in manualOrder.
  const { manualOrder, ...rest } = list
  return {
    ...rest,
    orderAdded: list.orderAdded ?? manualOrder ?? [],
    orderRemoved: list.orderRemoved ?? [],
  }
}
/** Fills fields added after a state was stored, keeping its lists and order products. */
export function normalizePrepState(state: StoredPrepState): PrepState {
  return {
    revision: state.revision,
    menu: state.menu,
    products: state.products ?? structuredClone(DEFAULT_PRODUCTS),
    current: normalizeList(state.current),
    draft: normalizeList(state.draft),
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
export function parseProducts(value: unknown): ProductGroup[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new PrepInputError('Invalid products')
  const ids = new Set<string>()
  return value.map((raw) => {
    const group = record(raw)
    const id = text(group.id, 100)
    if (ids.has(id)) throw new PrepInputError('Duplicate ID')
    ids.add(id)
    return { id, name: text(group.name), products: strings(group.products) }
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
      command = { type: 'start', date, listId: text(raw.listId, 100) }
      break
    }
    case 'menu':
      command = {
        type: 'menu',
        groups: parseMenu(raw.groups),
        base: parseMenu(raw.base),
      }
      break
    case 'products':
      command = {
        type: 'products',
        groups: parseProducts(raw.groups),
        base: parseProducts(raw.base),
      }
      break
    case 'finalize':
    case 'discard':
      command = { type: raw.type, listId: text(raw.listId, 100) }
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
        base: text(raw.base, 10000, true),
      }
      break
    case 'order': {
      const names = strings(raw.names)
      if (!names.length) throw new PrepInputError('Invalid list')
      command = {
        type: 'order',
        listId: text(raw.listId, 100),
        names,
        ordered: flag(raw.ordered),
      }
      break
    }
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

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}
// State and commands are plain JSON. Copying them as JSON also accepts the
// reactive proxies a screen holds, which structuredClone rejects.
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function applyPrepCommand(
  input: PrepState,
  command: PrepCommand,
): PrepState {
  const state = copy(input)
  if (command.type === 'start') {
    // Starting again must not wipe a list someone else is already preparing.
    if (state.draft)
      throw new PrepConflictError('A new list is already being prepared')
    if (state.current?.id === command.listId)
      throw new PrepInputError('Invalid list')
    state.draft = {
      id: command.listId,
      date: command.date,
      groups: copy(state.menu),
      selected: [],
      completed: [],
      notes: '',
      orderAdded: [],
      orderRemoved: [],
    }
  } else if (command.type === 'finalize' || command.type === 'discard') {
    if (!state.draft || state.draft.id !== command.listId)
      throw new PrepConflictError('The draft list has changed')
    if (command.type === 'finalize') state.current = state.draft
    state.draft = null
  } else if (command.type === 'menu') {
    if (!sameValue(state.menu, command.base))
      throw new PrepConflictError('The menu has changed')
    state.menu = copy(command.groups)
    if (state.current)
      state.current.groups = syncCatalog(state.current, state.menu)
    if (state.draft) state.draft.groups = syncCatalog(state.draft, state.menu)
  } else if (command.type === 'products') {
    if (!sameValue(state.products, command.base))
      throw new PrepConflictError('The products have changed')
    state.products = copy(command.groups)
  } else {
    const list =
      (state.draft?.id === command.listId ? state.draft : null) ??
      (state.current?.id === command.listId ? state.current : null)
    if (!list) throw new PrepConflictError('The list has changed')
    if (command.type === 'select') {
      const validIds = new Set(
        list.groups.flatMap((group) => group.items.map((item) => item.id)),
      )
      if (command.ids.some((id) => !validIds.has(id)))
        throw new PrepConflictError('The menu has changed')
      list.selected = command.selected
        ? [...new Set([...list.selected, ...command.ids])]
        : list.selected.filter((id) => !command.ids.includes(id))
      list.completed = list.completed.filter((id) => list.selected.includes(id))
      list.groups = syncCatalog(list, state.menu)
    } else if (command.type === 'complete') {
      if (!list.selected.includes(command.id))
        throw new PrepConflictError('Item is not selected')
      list.completed = command.completed
        ? [...new Set([...list.completed, command.id])]
        : list.completed.filter((id) => id !== command.id)
    } else if (command.type === 'notes') {
      if (list.notes !== command.base && list.notes !== command.text)
        throw new PrepConflictError('The notes have changed')
      list.notes = command.text
    } else {
      const linked = new Set(
        orderSuggestions(list).map((line) => productKey(line.name)),
      )
      for (const name of command.names) {
        const key = productKey(name)
        list.orderAdded = list.orderAdded.filter(
          (added) => productKey(added) !== key,
        )
        list.orderRemoved = list.orderRemoved.filter((removed) => removed !== key)
        // Linked products are ordered unless removed; anything else only when added.
        if (command.ordered && !linked.has(key)) list.orderAdded.push(name)
        if (!command.ordered && linked.has(key)) list.orderRemoved.push(key)
      }
    }
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
/** Identity of a product across prep items, the catalog and history. */
export function productKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
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
        const key = productKey(ingredient)
        const line = result.get(key) || { name: ingredient.trim(), sources: [] }
        const source = `${group.name} · ${item.name}`
        if (!line.sources.includes(source)) line.sources.push(source)
        result.set(key, line)
      }
  return [...result.values()]
}
export interface OrderLine {
  key: string
  name: string
  /** Where the product comes from: selected prep, the product catalog or typed in. */
  section: 'prep' | 'catalog' | 'other'
  /** Prep items that need it. */
  sources: string[]
  /** Catalog group, for catalog products. */
  groupId?: string
  groupName?: string
  ordered: boolean
}
/** Every product the order list can show, each once, with whether it is on the order. */
export function orderLines(
  list: PrepList,
  products: ProductGroup[],
): OrderLine[] {
  const removed = new Set(list.orderRemoved)
  const added = new Map(list.orderAdded.map((name) => [productKey(name), name]))
  const lines: OrderLine[] = orderSuggestions(list).map((line) => {
    const key = productKey(line.name)
    return {
      key,
      name: line.name,
      section: 'prep',
      sources: line.sources,
      ordered: added.has(key) || !removed.has(key),
    }
  })
  const seen = new Set(lines.map((line) => line.key))
  for (const group of products)
    for (const name of group.products) {
      const key = productKey(name)
      if (seen.has(key)) continue
      seen.add(key)
      lines.push({
        key,
        name,
        section: 'catalog',
        sources: [],
        groupId: group.id,
        groupName: group.name,
        ordered: added.has(key),
      })
    }
  for (const [key, name] of added)
    if (!seen.has(key)) {
      seen.add(key)
      lines.push({ key, name, section: 'other', sources: [], ordered: true })
    }
  return lines
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
export function orderReceipt(
  list: PrepList,
  products: ProductGroup[],
): ReceiptLine[] {
  return orderLines(list, products)
    .filter((line) => line.ordered)
    .map((line) => ({ text: line.name, kind: 'item' }))
}
/** The receipt as plain text, for sending in a message. */
export function receiptText(
  title: string,
  date: string,
  lines: ReceiptLine[],
): string {
  const text = [`${title} · ${date}`]
  let previous: ReceiptLine['kind'] | undefined
  for (const line of lines) {
    // Items stay together under their heading; everything else gets a blank line.
    if (line.kind !== 'item' || !previous || previous === 'note')
      text.push('')
    text.push(line.kind === 'item' ? `- ${line.text}` : line.text)
    previous = line.kind
  }
  return text.join('\n')
}
