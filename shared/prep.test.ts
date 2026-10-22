import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import {
  applyPrepCommand,
  emptyPrepState,
  normalizePrepState,
  orderLines,
  orderReceipt,
  orderSuggestions,
  parsePrepRequest,
  PrepConflictError,
  PrepInputError,
  prepReceipt,
  receiptText,
  selectedGroups,
  workingPrepList,
} from './prep'
import type { PrepGroup, PrepState, ProductGroup } from './prep'
const menu: PrepGroup[] = [
  {
    id: 'caesar',
    name: 'Caesar',
    items: [
      { id: 'lettuce', name: 'Cut lettuce', ingredients: ['Lettuce'] },
      {
        id: 'dressing',
        name: 'Make dressing',
        ingredients: ['Oil', 'Vinegar'],
      },
    ],
  },
  {
    id: 'generic',
    name: 'Generics',
    items: [
      {
        id: 'pink',
        name: 'Mix pink vinegar',
        ingredients: ['vinegar', 'Red vinegar'],
      },
    ],
  },
]
const products: ProductGroup[] = [
  { id: 'basics', name: 'Basics', products: ['Olive oil', 'Salt', 'Lettuce'] },
]
/** A published list with nothing selected. */
function start(): PrepState {
  const state = applyPrepCommand(
    { ...emptyPrepState(), menu, products },
    { type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' },
  )
  return applyPrepCommand(state, { type: 'finalize', listId: state.draft!.id })
}
function selected(): PrepState {
  const state = start()
  return applyPrepCommand(state, {
    type: 'select',
    listId: state.current!.id,
    ids: ['dressing', 'pink'],
    selected: true,
  })
}

describe('default prep menu', () => {
  it('copies the hosted Prep List dishes and items without extra item data', () => {
    const dishes = emptyPrepState().menu.map((group) => ({
      name: group.name,
      items: group.items.map((item) => item.name),
    }))
    expect(dishes).toEqual([
      {
        name: 'Snaks',
        items: ['Olives', 'Butter for bread', 'Compote for cheese', 'Charcutería'],
      },
      {
        name: 'Ceasar salad',
        items: ['Slice Romane Salad', 'Caesar dressing', 'Crutons'],
      },
      {
        name: 'Vitelo tonnato',
        items: ['Slice vitelo', 'Tuna Mayo', 'Chives', 'Veal jus', 'Make Vitelo'],
      },
      {
        name: 'Ragú',
        items: ['Ragu', 'Parmesan', 'Butter cubes', 'Spinach pack'],
      },
      {
        name: 'Stracciaela',
        items: ['Stracciaela', 'Herbs', 'Zucchini'],
      },
      {
        name: 'Chanterelle pasta',
        items: [
          'Clean mushrooms',
          'Miso mushrooms stock',
          'Parley',
          'Cut onion for pasta',
        ],
      },
      {
        name: 'Cheesecake',
        items: ['Cheese cake', 'Blueberries compot', 'Almond crumble'],
      },
      {
        name: 'Tomato salad',
        items: ['Tomatoes', 'Pesto', 'Roasted Pinenuts', 'Olives capers mix'],
      },
      {
        name: 'Oeuf Mayo',
        items: ['Boil eggs', 'Safran mayo', 'Yellow caviar', 'Pickled Carrots'],
      },
      {
        name: 'Beef tartare',
        items: [
          'Cut beef tartare meet',
          'Chopped capers',
          'Dice onion for tartar',
          'Parley and terragon for tartar',
          'Pickled mustard seeds',
          'Chips for tartar',
          'Egg yolk for tartar',
          'Pack salad',
        ],
      },
    ])
    expect(emptyPrepState().menu.flatMap((group) => group.items)).toHaveLength(42)
    expect(
      emptyPrepState().menu.every((group) =>
        group.items.every((item) => item.ingredients.length === 0),
      ),
    ).toBe(true)
  })
})

describe('daily kitchen handoff', () => {
  it('prepares every new list as a draft until it is published', () => {
    const state = applyPrepCommand(
      { ...emptyPrepState(), menu },
      { type: 'start', date: '2026-09-17', listId: 'list-2026-09-17' },
    )
    expect(state.current).toBeNull()
    expect(workingPrepList(state)?.id).toBe(state.draft?.id)
    const published = applyPrepCommand(state, {
      type: 'finalize',
      listId: state.draft!.id,
    })
    expect(published.current?.id).toBe(state.draft?.id)
    expect(published.draft).toBeNull()
  })

  it('keeps the current list while preparing a new draft', () => {
    let state = selected()
    state = applyPrepCommand(state, {
      type: 'notes',
      listId: state.current!.id,
      text: 'Test the new dessert',
      base: '',
    })
    state = applyPrepCommand(state, {
      type: 'order',
      listId: state.current!.id,
      names: ['Bin bags'],
      ordered: true,
    })
    const next = applyPrepCommand(state, { type: 'start', date: '2026-09-18', listId: 'list-2026-09-18' })
    expect(next.draft).toMatchObject({
      selected: [],
      completed: [],
      notes: '',
      orderAdded: [],
      orderRemoved: [],
    })
    expect(next.draft?.id).not.toBe(state.current?.id)
    expect(next.current?.id).toBe(state.current?.id)
    expect(workingPrepList(next)?.id).toBe(next.draft?.id)
    const oldItem = next.current!.selected[0]!
    const oldUpdated = applyPrepCommand(next, {
      type: 'complete',
      listId: next.current!.id,
      id: oldItem,
      completed: true,
    })
    expect(oldUpdated.current?.completed).toContain(oldItem)
    expect(next.menu).toEqual(menu)
    const finalized = applyPrepCommand(next, {
      type: 'finalize',
      listId: next.draft!.id,
    })
    expect(finalized.current?.id).toBe(next.draft?.id)
    expect(finalized.draft).toBeNull()
  })
  it('never replaces a draft by starting again, and discards it only on request', () => {
    const state = applyPrepCommand(start(), {
      type: 'start',
      date: '2026-09-18',
      listId: 'list-2026-09-18',
    })
    expect(() =>
      applyPrepCommand(state, { type: 'start', date: '2026-09-19', listId: 'list-2026-09-19' }),
    ).toThrow(PrepConflictError)
    const discarded = applyPrepCommand(state, {
      type: 'discard',
      listId: state.draft!.id,
    })
    expect(discarded.draft).toBeNull()
    expect(discarded.current).toEqual(state.current)
    expect(() =>
      applyPrepCommand(discarded, {
        type: 'finalize',
        listId: state.draft!.id,
      }),
    ).toThrow(PrepConflictError)
  })
  it('keeps catalog order, omits empty dishes and reverses completion without changing print content', () => {
    let state = selected()
    const before = prepReceipt(state.current!)
    state = applyPrepCommand(state, {
      type: 'complete',
      listId: state.current!.id,
      id: 'pink',
      completed: true,
    })
    expect(prepReceipt(state.current!)).toEqual(before)
    state = applyPrepCommand(state, {
      type: 'complete',
      listId: state.current!.id,
      id: 'pink',
      completed: false,
    })
    expect(state.current?.completed).toEqual([])
    state = applyPrepCommand(state, {
      type: 'select',
      listId: state.current!.id,
      ids: ['dressing'],
      selected: false,
    })
    expect(selectedGroups(state.current!).map((group) => group.id)).toEqual([
      'generic',
    ])
  })
  it('preserves selected names and ingredients when the menu is changed or removed, until replacement', () => {
    let state = selected()
    const before = prepReceipt(state.current!)
    state = applyPrepCommand(state, { type: 'menu', groups: [], base: menu })
    expect(prepReceipt(state.current!)).toEqual(before)
    expect(orderSuggestions(state.current!)).toHaveLength(3)
    const next = applyPrepCommand(state, { type: 'start', date: '2026-09-18', listId: 'list-2026-09-18' })
    expect(next.draft?.groups).toEqual([])
  })
  it('adds newly configured items to the creator without selecting them', () => {
    const state = applyPrepCommand(selected(), {
      type: 'menu',
      groups: [
        ...menu,
        {
          id: 'new',
          name: 'Soup',
          items: [{ id: 'soup', name: 'Make soup', ingredients: ['Carrots'] }],
        },
      ],
      base: menu,
    })
    expect(state.current?.groups.at(-1)?.name).toBe('Soup')
    expect(state.current?.selected).not.toContain('soup')
    expect(
      orderSuggestions(state.current!).some((item) => item.name === 'Carrots'),
    ).toBe(false)
  })
  it('prints long free text independently of dishes and orders', () => {
    const state = start()
    const text = 'Trial for the new menu.\n'.repeat(100)
    const next = applyPrepCommand(state, {
      type: 'notes',
      listId: state.current!.id,
      text,
      base: '',
    })
    expect(prepReceipt(next.current!)).toEqual([{ text, kind: 'note' }])
    expect(orderReceipt(next.current!, products)).toEqual([])
  })
})

describe('order list', () => {
  function order(state: PrepState, names: string[], ordered: boolean) {
    return applyPrepCommand(state, {
      type: 'order',
      listId: state.current!.id,
      names,
      ordered,
    })
  }
  const ordered = (state: PrepState) =>
    orderReceipt(state.current!, products).map((line) => line.text)

  it('orders the products linked to selected prep, each once with its sources', () => {
    const state = selected()
    expect(
      orderSuggestions(state.current!).find((item) => item.name === 'Vinegar')
        ?.sources,
    ).toEqual(['Caesar · Make dressing', 'Generics · Mix pink vinegar'])
    expect(ordered(state)).toEqual(['Oil', 'Vinegar', 'Red vinegar'])
  })
  it('lets the cook untick a linked product and tick it again', () => {
    let state = order(selected(), ['vinegar'], false)
    expect(ordered(state)).toEqual(['Oil', 'Red vinegar'])
    expect(
      orderLines(state.current!, products).find((line) => line.key === 'vinegar'),
    ).toMatchObject({ section: 'prep', ordered: false })
    state = order(state, ['VINEGAR'], true)
    expect(ordered(state)).toEqual(['Oil', 'Vinegar', 'Red vinegar'])
    expect(state.current).toMatchObject({ orderAdded: [], orderRemoved: [] })
  })
  it('offers catalog products unticked and keeps ticked and typed products when the prep changes', () => {
    let state = selected()
    const catalog = orderLines(state.current!, products).filter(
      (line) => line.section === 'catalog',
    )
    expect(catalog.map((line) => [line.name, line.ordered])).toEqual([
      ['Olive oil', false],
      ['Salt', false],
      ['Lettuce', false],
    ])
    state = order(state, ['Salt', 'Bin bags'], true)
    state = applyPrepCommand(state, {
      type: 'select',
      listId: state.current!.id,
      ids: ['dressing'],
      selected: false,
    })
    expect(ordered(state)).toEqual(['vinegar', 'Red vinegar', 'Salt', 'Bin bags'])
    expect(
      orderLines(state.current!, products).find((line) => line.key === 'bin bags'),
    ).toMatchObject({ section: 'other', ordered: true })
    state = order(state, ['bin bags'], false)
    expect(ordered(state)).not.toContain('Bin bags')
  })
  it('shows a catalog product once, under the prep, when a selected item links it', () => {
    const published = start()
    const state = applyPrepCommand(published, {
      type: 'select',
      listId: published.current!.id,
      ids: ['lettuce'],
      selected: true,
    })
    const lettuce = orderLines(state.current!, products).filter(
      (line) => line.key === 'lettuce',
    )
    expect(lettuce).toEqual([
      expect.objectContaining({ section: 'prep', ordered: true }),
    ])
  })
  it('replaces the product catalog only from the version it was edited from', () => {
    const state = start()
    const groups = [{ id: 'dry', name: 'Dry store', products: ['Flour'] }]
    expect(
      applyPrepCommand(state, { type: 'products', groups, base: products })
        .products,
    ).toEqual(groups)
    expect(() =>
      applyPrepCommand(state, { type: 'products', groups, base: [] }),
    ).toThrow(PrepConflictError)
  })
  it('shares the receipts as plain text', () => {
    const state = selected()
    expect(receiptText('Order list', '2026-09-17', orderReceipt(state.current!, products))).toBe(
      'Order list · 2026-09-17\n\n- Oil\n- Vinegar\n- Red vinegar',
    )
    const withNotes = applyPrepCommand(state, {
      type: 'notes',
      listId: state.current!.id,
      text: 'Taste the soup',
      base: '',
    })
    expect(receiptText('Prep list', '2026-09-17', prepReceipt(withNotes.current!))).toBe(
      [
        'Prep list · 2026-09-17',
        '',
        'Caesar',
        '- Make dressing',
        '',
        'Generics',
        '- Mix pink vinegar',
        '',
        'Taste the soup',
      ].join('\n'),
    )
  })
})

describe('screen state', () => {
  it('applies commands to the reactive state and values a page holds', () => {
    const state = reactive(start())
    const groups = reactive(structuredClone(menu))
    const next = applyPrepCommand(state, {
      type: 'menu',
      groups,
      base: reactive(structuredClone(menu)),
    })
    expect(next.menu).toEqual(menu)
    const selectedState = applyPrepCommand(reactive(next), {
      type: 'select',
      listId: next.current!.id,
      ids: reactive(['lettuce']),
      selected: true,
    })
    expect(selectedState.current?.selected).toEqual(['lettuce'])
  })
})

describe('concurrent edits', () => {
  it('rejects notes and menus edited from an older version', () => {
    const published = start()
    const state = applyPrepCommand(published, {
      type: 'notes',
      listId: published.current!.id,
      text: 'First cook',
      base: '',
    })
    expect(() =>
      applyPrepCommand(state, {
        type: 'notes',
        listId: state.current!.id,
        text: 'Second cook',
        base: '',
      }),
    ).toThrow(PrepConflictError)
    expect(() =>
      applyPrepCommand(state, { type: 'menu', groups: [], base: [] }),
    ).toThrow(PrepConflictError)
  })
  it('treats changes to removed lists and items as conflicts', () => {
    const state = start()
    expect(() =>
      applyPrepCommand(state, {
        type: 'select',
        listId: 'replaced',
        ids: ['lettuce'],
        selected: true,
      }),
    ).toThrow(PrepConflictError)
    expect(() =>
      applyPrepCommand(state, {
        type: 'complete',
        listId: state.current!.id,
        id: 'lettuce',
        completed: true,
      }),
    ).toThrow(PrepConflictError)
  })
})

describe('stored state', () => {
  it('moves typed order products of older lists into the order list', () => {
    const { current } = start()
    const { orderAdded, orderRemoved, ...older } = current!
    const state = normalizePrepState({
      revision: 3,
      menu,
      current: { ...older, manualOrder: ['Bin bags'] },
    })
    expect(state.current).toEqual({
      ...older,
      orderAdded: ['Bin bags'],
      orderRemoved: [],
    })
    expect(state.draft).toBeNull()
    expect(state.products).toEqual(emptyPrepState().products)
  })
})

describe('API input boundaries', () => {
  it.each([
    null,
    { revision: 0, command: { type: 'start', date: '2026-02-31', listId: 'list-2026-02-31' } },
    { revision: 0, command: { type: 'start', date: '2026-09-17' } },
    {
      revision: 0,
      command: {
        type: 'notes',
        listId: 'id',
        text: 'a'.repeat(10001),
        base: '',
      },
    },
    { revision: 0, command: { type: 'notes', listId: 'id', text: 'a' } },
    {
      revision: 0,
      command: { type: 'select', listId: 'id', ids: ['x'], selected: 'true' },
    },
    {
      revision: 0,
      command: { type: 'menu', groups: [menu[0], menu[0]], base: menu },
    },
    { revision: 0, command: { type: 'menu', groups: menu } },
    {
      revision: 0,
      command: { type: 'order', listId: 'id', names: [], ordered: true },
    },
    {
      revision: 0,
      command: { type: 'order', listId: 'id', items: ['Bin bags'] },
    },
    {
      revision: 0,
      command: {
        type: 'products',
        groups: [{ id: 'a', name: '', products: [] }],
        base: [],
      },
    },
  ])('rejects malformed requests', (body) =>
    expect(() => parsePrepRequest(body)).toThrow(PrepInputError),
  )
})
