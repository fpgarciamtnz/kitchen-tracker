# Recipe book plan

Status: planning complete for an MVP. No recipe-book source code has been implemented yet.

Project: Kitchen Tracker
Prepared: 2026-09-18

This document is the handoff for a future session. Read it together with [CONTEXT.md](./CONTEXT.md), then inspect the current repository before implementing anything. The final MVP storage decision in this document is D1 only. An earlier option considered D1 plus R2, but that was rejected for the MVP because the project goal is easy management and a small first version.

## Start here

Build a shared recipe book for everyone authenticated into the kitchen. Recipes are permanent kitchen references, independent from the prep list. They cover small preparations, components, techniques, and complete dishes.

The first version must let a cook:

1. Open the recipe book.
2. Find recipes through the current menu, other recipes, or old recipes.
3. Create a recipe for an item by rescuing an old recipe or starting a new one.
4. Paste an informal message, split it into movable text chunks, and assign chunks to Ingredients or Steps.
5. Create a recipe manually with two open text lists.
6. Attach one or two digital pictures as visual clues.
7. Read, copy, and print the complete text.
8. Rescue an old recipe when a menu item returns or matches it.

The product should reduce information bottlenecks. Every user with access to the kitchen can create and edit recipes.

## What was decided during grilling

### Purpose and boundary

- A recipe is a permanent shared kitchen reference.
- A recipe can describe a small preparation such as roasting peppers or marinating olives, a component such as a sauce, or a complete dish.
- Recipes are for consultation, checking, and sharing between coworkers. They should reduce the need to ask another person how to do something.
- Recipes have no current relationship with prep lists. Do not create prep tasks from recipes, copy recipes into prep lists, or make recipe edits rewrite old prep lists.
- Recipes are created and edited in the recipe book. Menu management only supplies the dish and item where a recipe may be attached.
- The current application has one shared authenticated kitchen session. For this MVP, everyone with that session has the same recipe editing access. Do not add roles or approval bottlenecks.

### Menu structure

The recipe book has three visible areas:

1. **Current Menu**
   - Mirrors the existing menu hierarchy.
   - Shows only dishes that contain at least one recipe-bearing item.
   - Inside a dish, shows only items that have a recipe.
2. **Other Recipes**
   - Shows recipes that are not currently attached to a live menu item.
   - This supports recipes created in the recipe book before they are assigned to a current item.
3. **Old Recipes**
   - Shows recipes whose item or parent dish was removed from the current menu.
   - Old recipes remain stored and searchable.
   - Old recipes can be rescued and attached to a new or returning item.

A dish is only a grouping of menu items. A dish never owns a recipe. Only an item can have a current recipe, and an item can have zero or one current recipe.

When a menu item is deleted, do not delete its recipe. The recipe remains in storage. The simplest MVP classification is derived from the live menu by comparing the recipe's stored `item_id` with current menu item IDs:

- item ID present: Current Menu;
- item ID empty: Other Recipes;
- item ID stored but absent from current menu: Old Recipes.

This avoids a fragile synchronization flag and avoids coupling every menu edit to a recipe write.

### Recipe creation and rescue

When creating a recipe for an item, offer exactly two primary choices:

- Search Old Recipes.
- Create a new recipe.

If the item name matches an old recipe, notify the user and offer rescue. Rescuing reattaches the existing recipe, including its text and pictures. It does not copy or rewrite the recipe.

If the user chooses a new recipe, create a new record. Existing recipes must not be overwritten.

### Names and uniqueness

- Every stored recipe has a stable unique ID.
- A recipe name is unique within the current kitchen/library.
- When a new recipe would use an existing name, the oldest existing recipe keeps its content and is renamed:
  - `Current name (old recipe)`
  - `Current name (old recipe 2)`
  - `Current name (old recipe 3)`
- The new recipe keeps the requested current name.
- Name collision resolution must be atomic so concurrent cooks cannot overwrite each other.
- Ingredient names and step wording do not need to be globally unique.

### Recipe content

Every recipe has two ordered sections:

- Ingredients
- Steps

Both sections are open text lists. The classic editor works like this:

1. Type a line.
2. Press Enter.
3. The current line is saved and a new row opens.
4. Continue until the section is complete.

Recipe lines preserve the kitchen's practical language. The tool should make arranging information easier and should not force polished prose.

There is no product-imposed character limit on recipe lines or total recipe text. Technical request or database limits must produce a visible error and must never silently truncate content.

### Paste and arrange workflow

The paste editor accepts an informal message from a coworker or boss. It should:

1. Accept the complete source text.
2. Split obvious lines, blank lines, and common list markers into editable text chunks.
3. Preserve the source wording.
4. Let the user assign each chunk to Ingredients, Steps, or an unresolved area.
5. Let the user edit, split, merge, delete, and reorder chunks.
6. Save the arranged chunks as the final Ingredients and Steps lists.

The parser is only a convenience. The user's manual arrangement is authoritative. A message that arrives as one long paragraph must remain recoverable through manual splitting.

### Pictures

- A recipe may have one or two pictures.
- Pictures are extra context and visual clues.
- Display pictures after the complete recipe text in the digital recipe view.
- Pictures do not become ingredients or steps.
- Pictures are not printed because the kitchen printer is not expected to preserve useful image quality.
- For the MVP, compressed pictures may have a visible technical size limit. That limit applies to image files only, never to recipe text.

### Copying and printing

Copy should place a plain-text version on the clipboard, for example:

```text
Recipe name

Ingredients
- 1 kg tomatoes
- salt to taste

Steps
1. Roast the tomatoes.
2. Blend until smooth.
```

Copying includes every ingredient and step. Pictures are not copied as binary data.

Printing includes:

- recipe name;
- every ingredient line;
- every step;
- all entered text.

Printing wraps long text and continues onto additional receipt pages or paper. It must never use an ellipsis or silently omit content. Printing is text-only.

## Storage decision for the MVP

Use D1 only as the source of truth.

R2 was considered for images and is the better long-term choice for large originals, but it adds a second service, another binding, separate operational checks, and a second migration path. That complexity does not earn its cost for a small first version.

For the MVP, store small compressed image files in D1 and isolate image read/write code in one server utility. If image sizes or volume later prove that D1 is the wrong place, move image bytes to R2 without changing recipe or line tables.

Do not use a flat JSON file, browser storage, KV, or Durable Objects for this feature:

- a flat JSON file is harder to search and update safely;
- browser storage is not shared between coworkers;
- KV is a poor fit for ordered recipe lines and concurrent edits;
- Durable Objects would add coordination machinery the MVP does not need.

## Proposed D1 model

Create a new numbered migration with separate recipe tables. Do not put recipes into the existing `prep_state` JSON document.

```text
recipes
- id
- kitchen_id
- item_id, nullable
- item_name_snapshot
- dish_name_snapshot
- name
- name_key
- created_at
- updated_at

recipe_lines
- id
- recipe_id
- section: ingredients | steps
- position
- text

recipe_images
- id
- recipe_id
- slot: 1 | 2
- mime_type
- image_data
- width
- height
- created_at
```

The current single-kitchen application can use one stable `kitchen_id` value. Keep the field in the model so future multi-kitchen isolation does not require redesigning every recipe table. Do not claim true multi-kitchen security until authentication and menu data are scoped in the same way.

Recommended indexes:

```text
recipes(kitchen_id, name_key)
recipes(kitchen_id, item_id)
recipe_lines(recipe_id, section, position)
recipe_images(recipe_id, slot)
```

Start search with normalized names and item snapshots. A full-text search table can be added later if the library becomes large. Do not add FTS5 to the MVP without evidence that simple indexed search is insufficient.

## Migration plan

The repository currently has:

```text
server/db/migrations/sqlite/0000_create_cleaning_state.sql
server/db/migrations/sqlite/0001_create_prep_state.sql
```

Add:

```text
server/db/migrations/sqlite/0002_create_recipe_library.sql
```

The migration creates the recipe tables and indexes. There is no existing recipe data to backfill.

Migration rules:

- Never edit an already-applied migration.
- Every schema change gets a new numbered migration.
- Keep migrations additive where possible.
- Use expand, backfill, switch, contract for future structural changes.
- Run large backfills as resumable operations with a cursor and progress record, not as one long request.

The existing deployment script already runs:

```text
pnpm run db:migrate && wrangler deploy
```

The operational indicator for schema state is D1's migration list. A new migration is needed when the repository contains a schema change that is not listed as applied in the remote database. The release workflow is:

1. Add the numbered migration.
2. Apply it to the local database.
3. Run tests and typecheck.
4. Build the application.
5. Inspect pending remote migrations with Wrangler.
6. Apply remote migrations through `pnpm db:migrate`.
7. Confirm the migration is marked applied.
8. Deploy the Worker.
9. Run a recipe smoke test.

For a future image move to R2:

1. Add storage metadata columns and an object key.
2. Create and bind the R2 bucket.
3. Copy each D1 image to R2 with a resumable script.
4. Record progress and checksums.
5. Switch reads to R2.
6. Keep D1 image data temporarily as fallback.
7. Remove old image bytes only in a later migration.

## Implementation sequence

### Phase 1: domain and persistence

- Add shared recipe types and validation.
- Add the recipe migration.
- Add recipe tables to the server schema.
- Add repository functions for recipe reads and writes.
- Add revision checking for concurrent edits.
- Add name collision and suffix logic.
- Add menu-based Current/Other/Old classification.
- Add rescue matching.

Completion criterion: recipe data can be created, read, updated, classified, rescued, and tested without modifying prep data.

### Phase 2: recipe API

- Add authenticated recipe list and detail endpoints.
- Add create, update, delete, rescue, and image operations.
- Keep recipe APIs behind the existing kitchen session middleware.
- Return conflict errors when a stale revision attempts to overwrite newer work.

Completion criterion: API tests cover all recipe commands, concurrent conflicts, name collisions, rescue, and long text.

### Phase 3: recipe book UI

- Add recipe navigation.
- Build Current Menu grouped by dish and item.
- Build Other Recipes.
- Build Old Recipes.
- Add item actions for Search Old Recipe and Create New Recipe.
- Add rescue notification and explicit user choice.
- Add recipe detail, edit, delete, and copy actions.

Completion criterion: an authenticated kitchen user can find every recipe category and move an old recipe back to a current item.

### Phase 4: editors and pictures

- Build the classic Ingredients editor.
- Build the classic Steps editor.
- Add Enter-to-create-row behavior and growing text fields.
- Build paste-and-arrange mode.
- Add chunk split, merge, move, edit, delete, and section assignment.
- Add one or two compressed picture attachments.
- Display pictures below the recipe text.

Completion criterion: both creation routes produce the same saved recipe shape, with pictures shown as digital context.

### Phase 5: copy and print

- Extract or adapt the existing prep print interaction.
- Create recipe-specific text formatting.
- Implement complete wrapping and continuation across pages.
- Exclude pictures from printing.
- Add clipboard copy formatting.

Completion criterion: a long recipe with long lines prints and copies every entered character without ellipses or omissions.

### Phase 6: validation and review

- Run unit tests.
- Run typecheck.
- Run migration checks locally and remotely where authorized.
- Test recipe creation, editing, deletion, rescue, search, copy, print, and picture display.
- Render the recipe pages and perform UI attention review.
- Review the real diff for simplification before merge.

Completion criterion: tests pass, migration state is known, the rendered UI supports the kitchen workflow, and the changed code has received a concrete review.

## Required tests

Shared-domain tests:

- one current recipe per item;
- empty and populated Ingredients and Steps;
- arbitrary long line preservation;
- text-chunk assignment;
- split, merge, move, edit, and delete chunks;
- menu-based Current/Other/Old classification;
- deletion of an item producing an old recipe;
- deletion of a dish producing old recipes for its items;
- rescue by matching item name;
- explicit user choice between rescue and new recipe;
- oldest-first duplicate name suffixing;
- concurrent revision conflict.

Server tests:

- authentication for all recipe endpoints;
- migration-compatible reads and writes;
- atomic name collision handling;
- image slot limit of one or two;
- visible rejection of invalid image data;
- recipe and prep state remaining separate.

Print and clipboard tests:

- every ingredient appears;
- every step appears;
- very long lines wrap;
- long recipes continue across pages;
- no ellipsis is introduced;
- images are excluded from printed text;
- copy output preserves section order and all text.

## Repository evidence

The existing repository patterns that should guide implementation are:

- `shared/prep.ts`: shared domain types, command validation, immutable state transitions, and receipt shaping;
- `server/utils/prep-state.ts`: D1 loading, revision checking, and conflict-safe updates;
- `server/db/prep-schema.ts`: Drizzle schema declarations;
- `server/db/migrations/sqlite/0000_create_cleaning_state.sql` and `0001_create_prep_state.sql`: numbered migration convention;
- `app/composables/usePrep.ts`: client loading, saving, conflict, and error state;
- `app/pages/prep/index.vue` and `app/pages/prep/create.vue`: current menu and list interaction patterns;
- `app/components/prep/Print.vue`: print and PDF download interaction;
- `app/utils/prep-print.ts`: jsPDF and Star PassPRNT transport;
- `app/utils/prep-print.test.ts`: print behavior tests;
- `server/middleware/auth.ts` and `server/utils/session.ts`: current shared kitchen authentication.

Reuse the revision and error-handling ideas. Do not reuse the prep state document as the recipe persistence model. Do not make recipe data part of shift prep behavior.

## Open assumptions and pause conditions

These items are implementation assumptions, not settled product requirements:

- The current deployment represents one kitchen. If multiple kitchens must coexist in one deployment, stop before schema finalization and scope menu, recipes, and authentication together.
- Recipe names are unique within the current kitchen. If the user instead wants duplicate names allowed between unrelated items, revise the collision rule before implementation.
- Rescue matching starts with case-insensitive, trimmed, normalized names. Fuzzy matching can be added later.
- Image compression and size limits are technical MVP safeguards. They must be shown to the user and must never constrain recipe text.
- The paste helper starts with deterministic line and list-marker splitting. Do not add AI parsing unless real examples show that the manual chunk editor is insufficient.
- Recipe version history, quantity scaling, public unauthenticated sharing, and recipe-to-prep links are outside the MVP.

## Skill and agent roles

### Skills already used in this planning session

| Skill | Responsibility and contribution |
|---|---|
| `grill-me` | Started the interview session and routed to grilling. |
| `grill-with-docs` | Combined the grilling interview with domain vocabulary and documentation. |
| `grilling` | Walked the design tree in dependency order and asked decision-bearing questions. |
| `domain-modeling` | Sharpened terms and recorded them in `CONTEXT.md`. |
| `sofia-coordinatior` | Selected roles, preserved handoff boundaries, and required a planning audit. |
| `grill-me-aquinas` | Separated said, meant, and happened; identified essence, accidents, constraints, and open potencies. |
| `audit-plan-descartes` | Separated repository facts, user constraints, assumptions, verification evidence, and essence fit. |
| `pattern-code-wittgenstein` | Inspected prep, D1, revision, and print precedents before proposing new structures. |
| `cloudflare` | Compared Cloudflare storage options and informed the D1-only MVP decision. |
| `workers-best-practices` | Supplied binding, migration, observability, and Worker configuration considerations. |
| `writing-for-agents` | Shaped this file as a restartable context handoff with explicit steps and completion criteria. |
| `unslop` | Keeps the handoff concrete, specific, and free of generic AI phrasing. |

### Skills for future implementation

| Skill | When to invoke it | Expected output |
|---|---|---|
| `pattern-code-wittgenstein` | Before writing recipe code | Reuse or create-new recommendation based on current files and tests. |
| `tdd` | If implementation is requested test-first | Red, green, refactor loop for recipe domain and API behavior. |
| `ui-attention-ciceron` | After recipe UI is rendered | Attention hierarchy, visual fit, wording fit, and smallest correction. |
| `synthesis-code-hegel` | After a real recipe diff exists | Recommendation to simplify, extract, merge, split, or leave the implementation. |
| `audit-plan-descartes` | Before any revised final plan | Updated foundation ledger and assumption audit. |
| `cloudflare` | If storage or bindings change | Product fit and current Cloudflare configuration evidence. |
| `workers-best-practices` | When changing Wrangler, Worker handlers, bindings, or uploads | Runtime and configuration checks. |
| `wrangler` | When running or troubleshooting migration/deployment commands | Safe Wrangler command sequence and migration status. |
| `communication-review-ciceron` | When preparing a proposal, release note, or handoff message | Rhetorical clarity and smallest useful rewrite. |
| `unslop` | Always for written output | Plain, specific, human-readable text. |

### Agent delegation boundary

No implementation agent should invent product rules. The primary agent should give each delegated agent the relevant section of this file and require file paths, tests, and assumptions in its report. Parallel work is appropriate for bounded fact-finding or independent test design. Changes touching the same domain files should remain sequential.

## Next-session instruction

Start the next session by reading:

1. `recipe book plan.md`;
2. `CONTEXT.md`;
3. the current git status;
4. the files listed under Repository evidence.

Then report:

- which decisions are settled;
- which assumptions are still open;
- what the first implementation slice will be;
- how it will be tested.

Do not restart the product interview unless new repository evidence conflicts with this plan or the user changes a settled rule. Do not implement R2 for the MVP. Start with D1 migration `0002_create_recipe_library.sql`, shared recipe types, and domain tests.
