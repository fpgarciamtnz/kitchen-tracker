import { createError } from 'h3'
import type { RequestLogger } from 'evlog'
import { and, eq } from 'drizzle-orm'
import {
  applyPrepCommand,
  emptyPrepState,
  normalizePrepState,
  PrepConflictError,
  PrepInputError,
} from '../../shared/prep'
import type { PrepList, PrepRequest, PrepState, StoredPrepState } from '../../shared/prep'
import { prepState } from '../db/prep-schema'
import { queryPrepHistory, syncPrepHistory } from './prep-history'

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
  const stored = JSON.parse(row.document) as StoredPrepState
  if (
    !Array.isArray(stored.menu) ||
    !('current' in stored) ||
    stored.revision !== row.revision
  )
    throw new Error('Invalid stored state')
  return { exists: true, state: upgradeLegacyMenu(normalizePrepState(stored)) }
}
function databaseReason(cause: unknown) {
  // Drizzle wraps the database error. Inspect causes, but never log SQL or stored content.
  let error = cause
  for (let depth = 0; depth < 5 && error instanceof Error; depth++) {
    if (/no such table:\s*prep_(state|history)/i.test(error.message))
      return 'missing_table'
    error = error.cause
  }
  return 'request_failed'
}
function failure(cause: unknown, log: RequestLogger): never {
  if (cause instanceof PrepConflictError)
    throw createError({
      statusCode: 409,
      statusMessage: 'The list changed. Reload before trying again.',
    })
  if (cause instanceof PrepInputError)
    throw createError({ statusCode: 400, statusMessage: cause.message })
  log.set({ database: { operation: 'prep', reason: databaseReason(cause) } })
  throw createError({
    statusCode: 503,
    statusMessage: 'Prep storage request failed',
  })
}
async function recordHistory(previous: PrepState, next: PrepState, log: RequestLogger) {
  // Only published lists are history. A finalize also records the list it replaced.
  const lists = [next.current, previous.current?.id === next.current?.id ? null : previous.current]
    .filter((list): list is PrepList => !!list)
  const changed =
    JSON.stringify([previous.current, previous.products]) !==
    JSON.stringify([next.current, next.products])
  if (!changed || !lists.length) return
  try {
    await syncPrepHistory(lists, next.products, next.revision)
  } catch (cause) {
    // The list itself is saved. The next change of the same list rewrites its history.
    log.warn('Prep history was not recorded', {
      database: { operation: 'prep_history', reason: databaseReason(cause) },
    })
  }
}
export async function readPrep(log: RequestLogger) {
  try {
    return (await load()).state
  } catch (cause) {
    failure(cause, log)
  }
}
export async function readPrepHistory(excludeListId: string, log: RequestLogger) {
  try {
    return await queryPrepHistory(excludeListId)
  } catch (cause) {
    failure(cause, log)
  }
}
// Commands say what changed, so a phone that has not seen another phone's
// latest change can still save on top of it. Only a real clash is a conflict.
const ATTEMPTS = 3
export async function updatePrep(request: PrepRequest, log: RequestLogger) {
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const previous = await load()
      const next = applyPrepCommand(previous.state, request.command)
      const values = { revision: next.revision, document: JSON.stringify(next) }
      // The revision guard makes the write atomic: if another write landed after
      // loading, nothing is saved and the command is applied again on top of it.
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
      if (!result) continue
      await recordHistory(previous.state, next, log)
      return next
    }
    throw new PrepConflictError()
  } catch (cause) {
    failure(cause, log)
  }
}
