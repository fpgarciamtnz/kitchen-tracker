import { createError } from 'h3'
import type { RequestLogger } from 'evlog'
import { and, eq } from 'drizzle-orm'
import {
  applyPrepCommand,
  emptyPrepState,
  PrepConflictError,
  PrepInputError,
} from '../../shared/prep'
import type { PrepRequest, PrepState } from '../../shared/prep'
import { prepState } from '../db/prep-schema'

function upgradeLegacyMenu(state: PrepState): PrepState {
  // Before the hosted menu was copied, the initial catalog was the single
  // empty Generics group. Keep any current handoff intact while replacing
  // that untouched catalog with the new defaults.
  const legacy =
    state.menu.length === 1 &&
    state.menu[0]?.id === 'generic' &&
    state.menu[0].name === 'Generics' &&
    state.menu[0].items.length === 0
  if (!legacy) return state
  return { ...state, menu: emptyPrepState().menu }
}

async function load() {
  const row = await db.select().from(prepState).where(eq(prepState.id, 1)).get()
  if (!row) return { exists: false, state: emptyPrepState() }
  const state = upgradeLegacyMenu(JSON.parse(row.document) as PrepState)
  if (
    !Array.isArray(state.menu) ||
    !('current' in state) ||
    state.revision !== row.revision
  )
    throw new Error('Invalid stored state')
  return { exists: true, state }
}
function failure(cause: unknown, log: RequestLogger): never {
  if (cause instanceof PrepConflictError)
    throw createError({
      statusCode: 409,
      statusMessage: 'The list changed. Reload before trying again.',
    })
  if (cause instanceof PrepInputError)
    throw createError({ statusCode: 400, statusMessage: cause.message })
  // Drizzle wraps the database error. Inspect causes, but never log SQL or stored content.
  let reason = 'request_failed'
  let error = cause
  for (let depth = 0; depth < 5 && error instanceof Error; depth++) {
    if (/no such table:\s*prep_state/i.test(error.message)) {
      reason = 'missing_table'
      break
    }
    error = error.cause
  }
  log.set({ database: { operation: 'prep', reason } })
  throw createError({
    statusCode: 503,
    statusMessage: 'Prep storage request failed',
  })
}
export async function readPrep(log: RequestLogger) {
  try {
    return (await load()).state
  } catch (cause) {
    failure(cause, log)
  }
}
export async function updatePrep(request: PrepRequest, log: RequestLogger) {
  try {
    const previous = await load()
    if (previous.state.revision !== request.revision)
      throw new PrepConflictError()
    const next = applyPrepCommand(previous.state, request.command)
    const values = { revision: next.revision, document: JSON.stringify(next) }
    // A stale device cannot replace a newer list or silently overwrite another cook's work.
    const result = previous.exists
      ? await db
          .update(prepState)
          .set(values)
          .where(
            and(
              eq(prepState.id, 1),
              eq(prepState.revision, previous.state.revision),
            ),
          )
          .returning({ revision: prepState.revision })
          .get()
      : await db
          .insert(prepState)
          .values({ id: 1, ...values })
          .onConflictDoNothing()
          .returning({ revision: prepState.revision })
          .get()
    if (!result) throw new PrepConflictError()
    return next
  } catch (cause) {
    failure(cause, log)
  }
}
