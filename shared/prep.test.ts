import { describe, expect, it } from 'vitest'
import {
  applyPrepCommand,
  emptyPrepState,
  orderReceipt,
  orderSuggestions,
  parsePrepRequest,
  prepReceipt,
  selectedGroups,
} from './prep'
import type { PrepGroup, PrepState } from './prep'
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
function start(): PrepState {
  return applyPrepCommand(
    { ...emptyPrepState(), menu },
    { type: 'start', date: '2026-09-17' },
  )
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
  it('keeps the current list while preparing a new draft', () => {
    let state = selected()
    state = applyPrepCommand(state, {
      type: 'notes',
      listId: state.current!.id,
      text: 'Test the new dessert',
    })
    state = applyPrepCommand(state, {
      type: 'order',
      listId: state.current!.id,
      items: ['Bin bags'],
    })
    const next = applyPrepCommand(state, { type: 'start', date: '2026-09-18' })
    expect(next.draft).toMatchObject({
      selected: [],
      completed: [],
      notes: '',
      manualOrder: [],
    })
    expect(next.draft?.id).not.toBe(state.current?.id)
    expect(next.current?.id).toBe(state.current?.id)
    const oldItem = next.current!.selected[0]!
    const oldUpdated = applyPrepCommand(next, {
      type: 'complete', listId: next.current!.id, id: oldItem, completed: true,
    })
    expect(oldUpdated.current?.completed).toContain(oldItem)
    expect(next.menu).toEqual(menu)
    const oldNote = applyPrepCommand(next, {
        type: 'notes',
        listId: state.current!.id,
        text: 'Stale note',
      })
    expect(oldNote.current?.notes).toBe('Stale note')
    expect(oldNote.draft?.notes).toBe('')
    const finalized = applyPrepCommand(next, { type: 'finalize', listId: next.draft!.id })
    expect(finalized.current?.id).toBe(next.draft?.id)
    expect(finalized.draft).toBeNull()
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
  it('links and deduplicates ingredients, removes unselected sources, and keeps independent products', () => {
    let state = selected()
    expect(
      orderSuggestions(state.current!).find((item) => item.name === 'Vinegar')
        ?.sources,
    ).toHaveLength(2)
    state = applyPrepCommand(state, {
      type: 'order',
      listId: state.current!.id,
      items: ['Bin bags'],
    })
    state = applyPrepCommand(state, {
      type: 'select',
      listId: state.current!.id,
      ids: ['dressing'],
      selected: false,
    })
    expect(orderReceipt(state.current!).map((line) => line.text)).toEqual([
      'vinegar',
      'Red vinegar',
      'Bin bags',
    ])
  })
  it('preserves selected names and ingredients when the menu is changed or removed, until replacement', () => {
    let state = selected()
    const before = prepReceipt(state.current!)
    state = applyPrepCommand(state, { type: 'menu', groups: [] })
    expect(prepReceipt(state.current!)).toEqual(before)
    expect(orderSuggestions(state.current!)).toHaveLength(3)
    const next = applyPrepCommand(state, { type: 'start', date: '2026-09-18' })
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
    })
    expect(prepReceipt(next.current!)).toEqual([{ text, kind: 'note' }])
    expect(orderReceipt(next.current!)).toEqual([])
  })
})

describe('API input boundaries', () => {
  it.each([
    null,
    { revision: 0, command: { type: 'start', date: '2026-02-31' } },
    {
      revision: 0,
      command: { type: 'notes', listId: 'id', text: 'a'.repeat(10001) },
    },
    {
      revision: 0,
      command: { type: 'select', listId: 'id', ids: ['x'], selected: 'true' },
    },
    { revision: 0, command: { type: 'menu', groups: [menu[0], menu[0]] } },
  ])('rejects malformed requests', (body) =>
    expect(() => parsePrepRequest(body)).toThrow(),
  )
  it('rejects completion of unselected items', () => {
    const state = start()
    expect(() =>
      applyPrepCommand(state, {
        type: 'complete',
        listId: state.current!.id,
        id: 'lettuce',
        completed: true,
      }),
    ).toThrow()
  })
})
