# Prep list: plan and audit

The feature implements the September 16 interview, including the final corrections about free text and independent order products.

## October 2026 revision

These decisions replace the earlier points about the order list position and the absence of history.

- The prep list and the order list are the core. Cleaning stays as a secondary feature and was not changed.
- Every new prep list is a draft until it is published. Starting again never discards someone else's draft; discarding is explicit.
- The order list has its own tab and fills itself from the selected prep: linked products start ticked. Independent products (oil, salt, cleaning supplies) live in a product catalog and start unticked. Anything else can be typed. A ticked product counts as ordered.
- Each order list belongs to its prep list. Publishing a new list leaves the previous order behind. Printing and sharing as text are the main outputs.
- Commands describe one change, so the server applies them to the latest state. Only notes, menu and catalog edits carry the version they started from and conflict when someone else changed it.
- The client copies state and commands as JSON. Copying Vue's reactive state with `structuredClone` threw, and since `3aaa751` every prep action from the screen was silently discarded.

## History and future suggestions

`prep_history` stores one row per prep item and per ordered product on each published list: list ID and date, item ID or product key, name, dish or product group, where the product came from (`prep`, `catalog`, `other`), when it was first recorded and when an item was ticked done. Rows follow the list while it is current and stay after it is replaced. Drafts and discarded lists are not history.

Stages:

1. **Now: record and show.** Rows are written on every change to the published list. The creator and the order list show when each thing was last on a list.
2. **Describe.** From the same rows, compute per item and product the usual interval between lists (median days), weekday patterns and how often a selected item is actually ticked done. Show it as a hint, such as "usually every 3 days". No new data needed.
3. **Suggest.** When starting a list, mark items whose usual interval has passed as suggestions the cook confirms. Their linked products follow into the order list as they do today. Start with simple interval rules; consider a statistical model only once there are months of rows and the rules are visibly wrong.
4. **Quantities (optional).** Only if quantities are ever recorded. Nothing stores them today, by design.

Product identity is the normalized name (`productKey`), so renaming a product starts a new history line. Prep items keep their ID across renames.

## Confirmed requirements

- The closing cook creates the next shift's list. The morning cook reads it on paper or a phone. Completion in the app is optional.
- Starting a new list requires confirmation and replaces the old list, its completion state, notes and order products. No history or carryover.
- A dish has named prep items; an item can link ingredient names for the order list. Generics are an ordinary group maintained independently of dishes.
- The creator sees all available items with one expanded dish at a time, checkboxes and a select-all control. The current view shows only selected work and permits reversible completion.
- Notes are long, free text for the current shift only. They do not replace catalog items and never generate orders.
- Order suggestions come from selected items. Manual products require no dish or item relationship. The person placing the order decides quantities and what to ignore. There is no automated purchasing or order-status claim.
- The order list stays at the bottom, collapsed until explicitly opened. Printing is available in creation and current views, independently for prep and orders.
- Anyone with existing kitchen access can edit the menu. Previously selected work survives menu edits or deletions until deselected or replaced.

## Evidence and assumptions audit

Foundation facts: Kitchen Tracker uses Nuxt, English i18n, shared session middleware and a bottom navigation layout. The workspace's D1 restoration supplies NuxtHub's database connection and SQLite migrations. The old `/home/quico/prep-list/app/pages/index.vue` generates 72 mm PDFs and sends them with `starpassprnt://v1/print/nopreview`, `size=576` and a return URL.

Foundation constraints: two distinct prep views, no permanent notes or recipe instructions/quantities, no reliance on digital completion, no new roles or purchasing workflow.

Aquinas handoff: the purpose is remembering work after a tiring shift and communicating it to the next cook. The paper is a reminder, not an authority. The last corrections supersede the earlier proposal to turn items into permanent notes.

Wittgenstein decision: extend the existing Nuxt pages, i18n, auth and database pattern; copy the printing transport carefully into a focused helper. Preserve its protocol, replace truncation with wrapping and pagination.

Descartes audit selected by the user: a KV document cannot support rapid same-key writes or atomic concurrent edits. D1 uses a revision-checked SQL update; stale clients receive a conflict and must reload. No silent last-write-wins behavior. Catalog and selected work are distinct so menu deletion cannot erase the handoff.

Implementation choices: preserve the app's English; group duplicate linked ingredient names case-insensitively while retaining sources; seed new storage with the dishes and items copied from the hosted Prep List, without its checked state, icons or ingredient links. Existing selected work retains its names and ingredient links. New lists use the latest menu.

Unverified external condition: physical Star printer delivery and device app availability. The PDF, wrapping, transport URL and callback can be verified locally; the kitchen phone must exercise the physical printer.

## Implementation sequence

1. Shared types, validated commands, snapshot rules and derived order/receipt content.
2. D1 table and migration; shared-session API with atomic revision checks.
3. Current view, creation view, editable catalog, notes and independent order products.
4. Prep tab and default landing; Star receipt and PDF download controls.
5. Domain tests, SQLite storage/concurrency tests, PDF tests, typecheck, production build and rendered mobile workflow verification.

No deployment or real orders are part of this implementation.

## Review and verification

Hegel review: keep the domain commands, persistence adapter and receipt helper separate. The two prep pages share notes, order and print components. The database uses the existing connection and auth rather than introducing another service. A menu reload after a conflict now asks before discarding local edits and loads a fresh form.

Ciceron UI review at 390 × 844: the title, expanded dish and task checkboxes are the strongest visible elements in creation. The expanded dish has a subtle border and selected-row fill; linked ingredients use smaller muted text. In the current view, selected work comes before notes, while orders remain below a divider and collapsed. The intended focus is supported; no blocking attention conflict was found. This is an inference from the rendered screens and DOM, not eye tracking.

Local browser verification covered menu creation, item selection, notes, manual products, reversible completion after reload, both PDF downloads, selecting all, one expanded group, the unsaved-note print guard, deletion snapshots, replacement cancellation and confirmed reset. The API returned 401 without the shared session, 400 for malformed input and 409 for a stale revision. The main browser workflow reported no JavaScript errors and no horizontal overflow at the mobile viewport.

Domain, SQLite concurrency and PDF tests accompany the feature. Typecheck and the Cloudflare production build pass. The generated build includes `0001_create_prep_state.sql`. Physical receipt delivery still needs the kitchen phone and printer; no production data or orders were changed during verification.
