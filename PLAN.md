# Playbook — V2 Modernization Plan

Forward-looking roadmap for revamping the original 2021 school project (`FbPlaybook.js`) into a modern, typed, npm-publishable library named `Playbook`. See [CLAUDE.md](CLAUDE.md) for what the project *is* and the locked technical decisions.

This file is the **single source of truth for where the project is going**. Update the checkboxes as phases complete — future Claude sessions read this file to know where work should pick up.

---

## Status overview

- [x] **Phase 1** — Library foundation (rename, refactor, drop jQuery, TS) ✅
- [x] **Phase 2** — Visual modernization (CSS, responsive) ✅
- [x] **Phase 3** — UX overhaul (reactive sandbox, unified save, per-page edit, connected layout) ✅
- [x] **Phase 4** — Functional polish & interaction UX (layout polish, save flow rework, animation guards) ✅
- [x] **Phase 4.5** — Library hardening & API cleanup (silent-failure fixes, API-shape settle, teardown/dispose) — *second refactor pass* ✅
- [ ] **Phase 5** — Playground MVP (editor + iframe preview)
- [ ] **Phase 6** — Playground polish (snippets, shareable URLs)
- [ ] **Phase 7** — Extension feature (JSON export/import)
- [ ] **Phase 8** — Docs + portfolio integration
- [ ] **Phase 9** — Publish to npm

---

## Success criteria

By the end, these resume bullets should all be true:

- "Modernized a 2021 jQuery school project (FbPlaybook.js) — migrated 1330-line library to ~400 lines of typed ES modules"
- "Dropped 30KB jQuery dependency; ships at ~4KB gzipped"
- "Built embeddable in-browser code playground (CodeMirror 6 + iframe sandbox) for live API exploration"
- "Added JSON export/import — feature not present in original"
- "Published to npm as `@connorburns/playbook`"

If we can't say all five truthfully at the end, we missed.

---

## Phase 1 — Library foundation

**Goal:** Replace the spaghetti IIFE with a clean, typed, modular library named `Playbook`. Functionally identical to V1 from a user's perspective.

**Work:**
- [x] **Rebrand:** Renamed `FbPlaybook` / `playBook` → `Playbook` (PascalCase) throughout V2 code, demos, tests. (`PlayDisplayer` kept.) README left for Phase 6.
- [x] Dropped jQuery; migrated `.animate()` calls to Web Animations API (`Element.animate()`)
- [x] Split `pub/js/FbPlaybook.js` (1330 lines) into modules under `src/`:
  - [x] `src/playbook.ts` — `Playbook` class
  - [x] `src/displayer.ts` — `PlayDisplayer` class
  - [x] `src/moves.ts` — Move catalog (one parameterized `buildCatalog(profile)` driven by per-size dimension profiles; collapses the two `getValidMoveList*` duplicates)
  - [x] `src/animation.ts` — `animateInSequence` + `resetAnimation`
  - [x] `src/types.ts` — `Position`, `MoveName`, `Move`, etc.
  - [x] `src/index.ts` — Public exports
- [x] Collapsed 11 duplicate `setXxxMove` methods into one `setMove(position, name)`
- [x] TypeScript strict mode, zero `any`
- [x] Build via `tsup` → ESM + CJS + `.d.ts` in `dist/`
- [x] Deleted `server.js` (Vite handles dev now)
- [x] Bug fixes: `'pass-1b'` typo fixed in demo data; arg-order/save-button logic untangled in the new class-based `Playbook`
- [x] Vitest setup with focused tests on `moves.ts` + core classes (21 tests passing)

**Exit criteria:** ✅ all met
- ✅ `npm run build` produces dist artifacts (ESM + CJS + .d.ts)
- ✅ Demo at http://localhost:5173/ rendered via Vite reproduces V1 behavior
- ✅ Bundle **4.87 KB gzipped** (was 30+ KB with jQuery — well under 10KB target)
- ✅ Zero `any` types (`npm run typecheck` clean)

---

## Phase 2 — Visual modernization

**Goal:** Make the library look like it was built in 2026. Responsive, modern, mobile-friendly.

**Work:**
- [x] New design tokens (CSS custom properties) — retired lightslategrey/green/thistle for a `--pb-*` token system
- [x] Responsive — `ResizeObserver` writes `--pb-field-scale` so the field at natural pixel dimensions visually fills any container while preserving aspect ratio (the pure-CSS `cqw / px` calc was fragile, ResizeObserver is reliable)
- [x] Mobile-friendly — field scales fluidly, sandbox grid uses `auto-fit minmax`, book widget already at `min(800px, 100%)`, showcase flips to single-column vertical stack
- [x] Modern typography (system font stack via `--pb-font`)
- [x] Field stripes (mowed-grass effect via `repeating-linear-gradient`) + line-of-scrimmage border. Yard lines tried but trimmed at user request.
- [x] Sandbox form redesigned — dropdowns in CSS grid, footer row with Confirm + rename input + Set Custom Name all left-justified
- [x] Dark mode via `prefers-color-scheme`
- [x] **A11y pass:** aria-labels on players (full position names), role="region" on widget roots, focus rings via `:focus-visible`, `prefers-reduced-motion` skips animation, h1→h2 heading hierarchy in demo, explicit image alt + width/height, anchor-styled-as-link-button (no nested interactive)
- [x] **Lighthouse polish:** lazy-loaded images, `preconnect` hint, meta description, theme-color, 44px tap targets

**Exit criteria:** ✅ all met (one with caveat noted)
- ✅ V1 vs V2 is a clear before/after (entirely new palette, layout, typography, dark mode)
- ✅ Lighthouse Accessibility **96** (target ≥ 95)
- ✅ Works on phone, tablet, desktop
- 🟡 Lighthouse Performance still at 69 — held back by external unoptimized demo images + dev-server overhead, **not** by the library itself. Library bundle is 5.49 KB gzipped. Best Practices 100, SEO 92. See Working notes for the breakdown.

---

## Phase 3 — UX overhaul

**Goal:** Sweep the V1-era form-submit friction out of the sandbox + save flow, and introduce a connected layout so field + sandbox + book form one coherent visual unit. The playground in Phase 4 builds on top of this cleaner API.

### Part A — Reactive sandbox + unified save (✅ done)

- [x] **Reactive sandbox dropdowns** — dropped "Confirm Animations". Each `<select change>` immediately calls `setMove(position, name)`. "Play Animation" plays whatever's currently set, no commit step.
- [x] **Reactive name input** — dropped "Set Custom Name". `input` event updates the field title live as the user types.
- [x] **Unified save flow** — dropped `allowUserCreatePlays()` from the API. The Save button on the book adds a page with current field state + name only (no image, no video). All metadata is added per-page after the fact via edit affordances.
- [x] **Per-page edit affordances** — each saved page shows "+ Add image" / "+ Add video link" buttons when those fields are empty; "Replace image" / "Edit link" chips when they're filled.
- [x] **Image file upload** — file picker → `FileReader.readAsDataURL` → `data:` URL becomes the `<img src>`. No URL paste, no backend.
- [x] **Video URL inline editor** — for "Add/Edit video", inline text input + Save / Cancel; click-to-edit replaces the displayed link.
- [x] **Initialize Play syncs sandbox dropdowns** — when a saved play is loaded back into the field, the sandbox `<select>` elements also update to match. `setMove` writes back to any registered sandbox dropdowns; one-way state → UI sync.
- [x] **Editable affordances only on user-saved pages** — developer-added plays (`book.addPage(...)`) are read-only. Only plays created via the Save button get the per-page edit chips. `buildPage` takes an `editable` flag instead of reading `this.allowSave` everywhere.
- [x] Updated demo to drop `allowUserCreatePlays` calls; consolidated showcase sections.
- [x] Updated tests — `allowUserCreatePlays` test removed; new tests for reactive sandbox + save flow + non-editable preloaded plays.

### Part B — Connected layout + responsive book (✅ done)

The stacked layout (field → sandbox → book) made the save action feel disconnected because the book sat far below the work happening in the sandbox. Fixed by visually coupling the three pieces and making the book itself responsive.

- [x] **`createConnectedLayout(parentId)` helper** — new module `src/layout.ts` that mounts a grid scaffold into the parent and returns `{ fieldSlot, sandboxSlot, bookSlot }` IDs. Library ships CSS for `.pb-connected-layout` handling the grid + breakpoint. PlayDisplayer and Playbook stay headless — the helper is pure DOM scaffolding + CSS, zero new coupling.
- [x] **Book structural refactor: single taskbar above pages** — Back / [Save] / Title / Forward all in one bar above the page slots, instead of split across two per-page taskbars. Means single-page mode (right slot hidden) still has every nav control visible. Old `.task-bar` class gone; new `.pb-book-taskbar` + `.pb-book-pages` row.
- [x] **Single-page book mode at narrow widths** — `container-type: inline-size` on `.pages-container`; `@container (max-width: 499px)` hides the right `.page-item`. JS reads `pages-container.clientWidth` via `pageStep` getter to flip nav from step-2 → step-1 below the same threshold. Same widget, same DOM, same data; only rendered presentation changes.
- [x] **Auto-flip to new page on save** — `saveFieldStateAsPage` calls `flipToPage(last index)` so the user sees their freshly-saved play immediately. In two-page mode, snaps to even index so the new page lands on the left. Essential in single-page mode where the new page would otherwise be invisible without a manual flip.
- [x] **Layout grid CSS** — connected layout = book column (left) + field-then-sandbox column (right) at viewports ≥ 1400 px; everything stacks vertically below. Book column is ~400 px in the wide layout, which naturally trips the book's @container breakpoint into single-page mode — exactly the "most laptops see the conjoined layout" outcome.
- [x] **Wire one demo section** to `createConnectedLayout`. The other showcases stay on the standalone API so the demo documents both usage patterns.
- [x] **Save button stays in book taskbar (option C, settled)** — visual adjacency from the connected layout removes the jank. Decision recorded in Working notes.
- [x] **Layout helper tests** — 3 new vitest tests covering scaffold mounting, end-to-end widget mounting into slots, and unique IDs across multiple layouts.

**Exit criteria for Part B:** ✅ all met
- ✅ `createConnectedLayout(parentId)` + 3 constructors = polished responsive layout, zero extra HTML
- ✅ Book gracefully switches to single-page mode when its container is narrow (verified in connected layout's narrow column and in standalone narrow contexts)
- ✅ Below ~1400 px viewport, connected layout stacks vertically and the book stays in two-page mode (column is now wide)
- ✅ 27 / 27 tests passing, typecheck clean, build clean
- ✅ Bundle size: **6.87 KB gzipped** (up from 5.89 — adds the layout helper + new book structural refactor, still well under budget)

### Deferred to Phase 4 (playground)

- **`createPlaybook({...})` one-call setup helper** that returns `{ field, book, layout, sandbox }` and handles everything in a single API call. Worth waiting until we know what the playground's other showcase snippets look like — that informs whether the right API shape is "everything in one call" or "compose from smaller helpers."

### API changes for Phase 3 (breaking — V2 is unpublished, so OK)

- `Playbook.allowUserCreatePlays()` removed
- `Playbook.addPage(image, ...)` — `image` now `string | null`
- `PlayDisplayer.spawnSandbox(allowSave?, parentId?)` — no longer renders Confirm Animations or Set Custom Name buttons; both flows are reactive
- New: `createConnectedLayout(parentId): { fieldSlot, sandboxSlot, bookSlot }` exported from `src/layout.ts`
- New: `.pb-connected-layout` CSS class shipped in `src/styles.css`

---

## Phase 4 — Functional polish & interaction UX

**Goal:** Layer of refinement that goes past visuals into how the library *feels*
when interacted with. Three independently-shippable parts: connected-layout
sizing polish, save-flow rework, and animation interaction guards. Lands
before the playground so playground snippets can lean on the cleaner APIs.

### Part A — Connected layout polish (✅ done)

The Phase 3 connected layout grouped book + field + sandbox into one column
but left them at independent natural heights. This pass turns them into a
true co-sized "rectangle of three," driven by the right column's natural
height so the unit never has dead space below the sandbox.

- [x] **Equal-height columns** — `align-items: stretch` on the row, plus a
  flex chain inside the book (`pages-container` → `pb-book-pages` →
  `page-item` → `page-image-section` → `page-image`) that lets the 4:3
  page images shrink to fit a height-constrained book column. `object-fit:
  contain` preserves the play diagrams' intrinsic aspect.
- [x] **Centered unit + capped main column width** — added `justify-content:
  center` on the row and `flex: 0 1 var(--pb-connected-main-max)` (defaults
  to 854 px for `large`; overridable for `xx-large`) on the main column.
  Eliminates the ~120 px of internal whitespace that previously fell
  between the book and field at wide viewports.
- [x] **Right column drives height (ResizeObserver)** — `align-self: start`
  on the main column so its measured size is the natural content height;
  observer in `layout.ts` writes that to `--pb-connected-main-h` on the
  layout root; book column reads it as `max-height`. Result: both columns
  end up at the right column's natural height; book pages shrink to fit;
  no dead space below the sandbox.
- [x] **Vertical-gap parity with horizontal gap** — neutralized the
  sandbox's `margin-top: var(--pb-gap)` inside `.pb-connected-layout`. The
  24 px flex gap is now the only separation, matching the book/field
  horizontal gap exactly.
- [x] **Sandbox shadow elevation match** — bumped `.sandbox`/`.sandbox-large`
  from `--pb-shadow-sm` to `--pb-shadow-md` so the three cards (book,
  field, sandbox) read at the same elevation.

### Part B — Save flow refinement (✅ done)

Phase 3 had landed the Save button in the book taskbar (option C). Once
the equal-height layout made the bottom of the right column visually
adjacent to the field, the Save action's natural home turned out to be
inside the sandbox name row instead — the natural end of the
edit-then-name-then-save workflow.

- [x] **Save button moved out of book taskbar → sandbox name row.** Book
  taskbar is now pure navigation (Back / Title / Forward).
- [x] **`Playbook.createSaveButton(label?: string)` public method** —
  returns a button bound to `saveFieldStateAsPage`, or `null` if the book
  has no connected field or `allowSave` is false. Caller decides where
  to mount it.
- [x] **`spawnSandbox(allowSave, parentId, saveButton?)` accepts the
  save button** as a third optional arg; mounts it into the existing
  `.pb-sandbox-rename` row alongside the name input.
- [x] **Rename "Save Play" → "Save to Book"** — clearer commit verb,
  names the destination so users know what the action does.
- [x] **Toned-down `--pb-success` green** — dark `#4caf6e → #3a8a5b`,
  light `#2c8a4a → #1f7c40`. Less neon, more forest; the primary action
  still reads as the obvious affordance but doesn't dominate.

### Part C — Animation interaction guards (✅ done)

While an animation is running, every other control on the field can
corrupt it (changing a dropdown overwrites the transform target;
clicking Initialize Play wholesale-replaces state mid-flight). This
part introduces "playback mode" — Play disables, controls lock,
Reset becomes visible — and exposes the completion signal as a public
Promise so playground tutorials can `await field.play()`.

- [x] **Disable Play Animation button during animation.** Track running
  state on the displayer; flip Play's `disabled` on click; flip it back
  when all per-player animations resolve.
- [x] **Use `Promise.all` over per-player promises, not duration math.**
  `animateInSequence` already returns a Promise that resolves when each
  player's chain finishes (lines 28–80 of `animation.ts`). Collecting
  them with `Promise.all` correctly handles `prefers-reduced-motion`,
  no-op steps, cancellation, and exact frame timing — math on
  `max(per-player total duration)` would get those wrong.
- [x] **Reveal Reset only after first animation finishes.** Use
  `visibility: hidden → visible` (not `display: none`) so the Play row
  doesn't reflow. Reset stays visible after the first play.
- [x] **Lock sandbox dropdowns during animation.** Set the `<select>`s
  disabled when Play fires, re-enable on completion. Prevents move-name
  changes from racing against the running transform.
- [x] **Lock per-page Initialize Play buttons during animation.** Same
  treatment — a wholesale state swap mid-flight visibly snaps players.
- [x] **Save to Book stays interactive.** It captures dropdown state
  (data), not transform state (in-flight), so a snapshot during play is
  coherent. No reason to lock it.
- [x] **Public `field.play(): Promise<void>` API.** Expose the
  Promise.all-await as a method on `PlayDisplayer`. Existing button
  handler delegates to it. Playground snippets become
  `await field.play(); // do next thing`. Cancel → Promise rejects with
  `AbortError`; caller wraps in `try/catch`.
- [x] **Tests** — new vitest cases covering disabled-during-play,
  Reset visibility flip, and the `field.play()` Promise resolution and
  cancel rejection.

**Exit criteria:** ✅ all met
- ✅ Clicking Play twice in quick succession only runs the animation once
  (`concurrent play() calls return the same in-flight Promise` test).
- ✅ Reset is invisible on initial render and after Reset is clicked again;
  visible while/after a play is running.
- ✅ During animation: dropdowns + Initialize Play disabled; Save to Book
  enabled; Play disabled.
- ✅ `await field.play()` resolves and leaves state in `played`.
- ✅ **41 tests passing** (9 `moves` + 32 `playbook`), typecheck + build
  clean, bundle still well under 10 KB gzipped.

---

## Phase 4.5 — Library hardening & API cleanup (second refactor pass)

**Goal:** Close the design/correctness gaps surfaced while building the
portfolio prototype, *before* the playground (Phase 5+) gets built on top
of the public API. Phase 1 was the **structural** refactor (1330-line IIFE
→ typed modules); this is the **hardening** refactor — kill silent
failures, settle the 1.0 API shape, and add the lifecycle teardown the
Next.js port needs. Found by a full read-through of `src/` on 2026-05-30
(see Working notes for the per-file scan). File:line anchors are from that
read and may drift as code changes — treat them as starting points.

### Tier 1 — Footguns (silent failures that hide bugs)

- [x] **Stop deriving DOM IDs from the user-supplied `name`.**
  `displayer.ts` builds element IDs off `this.name`: player `el.id` (107),
  `sandboxform${name}` (382), `select-${pos}-${name}` + `label.htmlFor`
  (394/397). Two displayers sharing a name (or both `''` — e.g. portfolio
  `demo-field` → a bare `<div id="c">`) emit **duplicate IDs** → invalid
  HTML + broken `<label>`→`<select>` a11y pairing. `layout.ts` already
  does this right with a module counter (37/45); apply the same per-
  instance unique suffix. Only the label/select pairing actually needs an
  id — player `el.id` looks like vestigial V1 jQuery-lookup leftover
  (nothing calls `getElementById` for it); delete if confirmed dead.
- [x] **`setMove` must not silently swallow unknown move names.**
  `displayer.ts` 219–223 coerces an unrecognized name to `'none'` with no
  signal — pass the old `'pass-1b'` typo and you get an empty player and
  zero feedback. Add a dev-mode `console.warn` (or throw) on unknown
  names; `KNOWN_MOVE_NAMES` is already exported for the check.
- [x] **`mountInto` must not silently fall back to `document.body`.**
  `dom.ts` 42 — a typo'd `parentId` mounts the widget at the bottom of
  `<body>` instead of erroring. Warn (or throw) when the id isn't found.
- [x] **`addPage` / Initialize Play must validate the moves array.**
  `playbook.ts` 245 does `moves[i] ?? 'none'` with no length check —
  passing ≠ 11 entries silently blanks or drops positions. Validate length
  (or adopt the partial-record shape below, which sidesteps it entirely).
  *Done in Tier 2: `normalizePageMoves` warns on a wrong-length array and the
  partial-record form sidesteps length entirely.*

### Tier 2 — API shape (settle before 1.0 / before playground snippets)

- [x] **`addPage` positional `moves: MoveName[]` → also accept
  `Partial<Record<Position, MoveName>>`.** Full write-up in the 2026-05-30
  working note below — widen the signature, normalize internally, keep the
  array form working. Also fixes the Tier-1 length problem for new callers.
- [x] **Collapse the dual constructor overloads.** Both `Playbook` (60–72)
  and `PlayDisplayer` (76–87) accept *either* an options object *or*
  positional args. Pick the options object for 1.0; the positional form is
  legacy-compat and only the demos use it. Migrate demos + tests, drop the
  positional overload. (Breaking, but V2 is unpublished — fine.)
- [x] **Stop baking external image URLs into the library.** `playbook.ts`
  42–43 seeds every book with two `i.ibb.co` pages and no opt-out →
  surprise third-party network request on construction, broken images if
  the host 404s, and no way to make an empty book. Make seed pages opt-in/
  injectable (e.g. `seedPages?: PageData[]` or a `seed: false` flag); move
  the demo cover/instructions images into the demo, out of `src/`.

### Tier 3 — Lifecycle (blocks the clean Next.js port — Task 3 / Phase 8) ✅

- [x] **Add `destroy()` to `PlayDisplayer` and `Playbook`, and a disposer
  from `createConnectedLayout`.** Settled on a single `destroy()` method
  name per class (not a `destroy`/`dispose` pair) and a `destroy()` member
  on the `ConnectedLayout` return object. All three are idempotent (guard
  flag), so React StrictMode's double-invoke is safe.
  - `PlayDisplayer.destroy()` — cancels the in-flight animation (`reset()`),
    disconnects the responsive ResizeObserver (now held as an instance
    field), clears `playbackSubs` / `movesSubs` / `sandboxSelectGroups`, and
    removes the field + every spawned sandbox shell from the DOM. Sandboxes
    are tracked in a new `sandboxes` array because they mount into arbitrary
    parents the displayer otherwise wouldn't be able to find.
  - `Playbook.destroy()` — releases the per-page `onPlaybackStateChange`
    subs it registered on the connected field (now captured into a
    `fieldSubs` array instead of fire-and-forget), drops page refs, removes
    the book DOM. Deliberately does **not** destroy the connected field —
    fields can be shared / owned elsewhere; caller destroys it separately.
  - `createConnectedLayout(...).destroy()` — disconnects the height-sync
    observer and removes the scaffold.
  - Tests: 8 new cases in a `destroy / lifecycle` block. Installs a tracking
    `ResizeObserver` stub (jsdom has none) to assert observe/disconnect
    counts; covers idempotency, sandbox teardown, sub-clearing (post-destroy
    `setMove` notifies nobody), field-survives-book-destroy, and a full
    mount→destroy cycle asserting both observers disconnect.

### Tier 4 — Hygiene / polish ✅

- [x] **Delete dead code.** Removed unused `createInput` from `dom.ts`
  (grep-confirmed dead). Player `el.id` was already replaced by
  `dataset.position` in Tier 1 — no id remains.
- [x] **Export consistency.** `POSITION_FULL_NAMES` now re-exported from
  `index.ts` alongside `POSITION_LABELS`.
- [x] **Extract `buildPage`** → new `src/page.ts`. The 160-line closure-
  component became a `Page` class: the three closure variables
  (`currentImage`, `currentVideoLink`, `videoEditorOpen`) are now fields and
  the two in-place rebuilders (`renderImage` / `renderVideoSection`) are
  methods. `buildDefaultPage` (seed pages) moved alongside it. `Playbook`
  keeps a thin `buildPage` wrapper that injects the connected field +
  `registerFieldSub` so teardown still releases the subscription.
- [x] **De-magic the numbers.** Natural field widths `854`/`1220` →
  `FIELD_NATURAL_WIDTH` in `moves.ts` (co-located with the other per-size
  dimensions); `img 400×300` → `PAGE_IMAGE_WIDTH`/`PAGE_IMAGE_HEIGHT` in
  `page.ts`, sourced once by both image renderers.
- [x] **Tighten `as` casts.** `reader.result as string` → `typeof` guard
  (a surprise `ArrayBuffer` can't reach the `<img src>` now). Left
  `select.value as MoveName` as a documented DOM-boundary cast — the
  `<select>` is populated only from the catalog + `'none'`, and `setMove`
  already validates + warns on unknown names downstream, so a runtime
  membership check there would just duplicate that.
- [x] **Naming overlap.** Renamed `PlayDisplayer.getMove(pos)` →
  `getAssignedMove(pos)` so it no longer shadows the module-level
  `getMove(name, size)` catalog lookup. Updated the one internal caller +
  tests. (Breaking, but V2 is unpublished.)

**Explicitly NOT smells (don't "fix"):** `moves.ts`, `animation.ts`,
`types.ts`, `index.ts` are clean. String-literal unions (`MoveName` /
`Position`) are already the modern idiom — no enums. `KNOWN_MOVE_NAMES` +
`getMoveCatalog` are already exported, so the discoverability story is
half-done.

**Exit criteria:**
- No widget emits duplicate DOM IDs when two instances share a name.
- Unknown move names / missing mount targets produce a visible dev warning
  (or throw), never a silent no-op.
- `addPage` accepts the partial-record move shape; the array form still
  works (test asserts both produce the same saved page).
- One constructor signature per class (options object).
- `destroy()` on both classes disconnects every observer + subscription;
  `createConnectedLayout` returns a disposer; a test mounts/unmounts and
  asserts no lingering observers.
- No external image URLs anywhere in `src/`.
- Dead code removed; tests + typecheck + build green; bundle still
  < 10 KB gzipped.

**Sequencing note:** Tier 3 (teardown) is the only item that *blocks*
later work (Task 3 Next.js port). Tier 1 is cheap and high-value (a few
`console.warn`s + one ID-uniqueness fix). Tier 2 is breaking-API and best
done as a batch before any playground snippets are written against the
current shape. Tier 4 can ride along opportunistically.

---

## Phase 5 — Playground MVP

**Goal:** Working interactive playground. Portfolio centerpiece.

**Work:**
- [ ] `playground/` folder, separate from `src/` (clean module boundary so it could be extracted later)
- [ ] CodeMirror 6 editor with JS syntax highlighting
- [ ] Run button
- [ ] iframe preview that loads the library + executes user code via `postMessage`
- [ ] Error display when code throws
- [ ] Reset button
- [ ] One preset example loaded by default
- [ ] Vite for dev + build

**Exit criteria:**
- Editing code + clicking Run updates the preview
- Syntax errors show cleanly without crashing the page

---

## Phase 6 — Playground polish

**Goal:** Make it feel like a product, not a demo.

**Work:**
- [ ] Tutorial sidebar with categorized preset snippets (see Phase 6 for the curated list — these are the docs)
- [ ] Live reload on keystroke (debounced ~500ms, optional toggle)
- [ ] URL state sharing — code encoded in URL hash so playgrounds are shareable
- [ ] Console pane mirroring `console.log` from inside the iframe
- [ ] Cmd/Ctrl+Enter keybind to run

**Exit criteria:**
- Shareable URLs round-trip code correctly
- Snippet buttons one-click load

---

## Phase 7 — Extension feature: JSON export/import

**Goal:** Make this a *revamp*, not just a *refactor*. Add a real new capability.

**Work:**
- [ ] `Playbook.toJSON()` — serialize a playbook (plays, moves, metadata) to a JSON structure
- [ ] `Playbook.fromJSON(data)` — reconstruct a playbook from JSON
- [ ] Playground integration: "Export playbook" button (downloads `.json`) + "Import playbook" button (file picker)
- [ ] Playground URL hash can include a base64-encoded playbook for one-click shareable demos
- [ ] Tests covering round-trip serialization

**Exit criteria:**
- A playbook can be exported, the JSON inspected by hand, edited, and re-imported successfully
- A playground URL can encode a full playbook and restore it on load

---

## Phase 8 — Docs + portfolio integration

**Goal:** Unified home in the Next.js portfolio. The playground IS the primary docs surface; a single `API.md` covers quick-reference needs.

**Work:**
- [ ] Curate the playground's preset snippet library as the tutorial — this is the docs:
  - **Getting started:** empty playbook, adding plays
  - **The PlayDisplayer:** creating a field, setting individual moves, sandbox mode
  - **Connected playbook + field:** initialize and play, saving user-created plays
  - **Advanced:** JSON export, JSON import
- [ ] One supplementary `API.md` — short reference page with class signatures, method signatures, and the valid-moves table (could live in the repo root or be rendered in the portfolio)
- [ ] Playground embedded as Next.js route (`/projects/playbook/play`)
- [ ] `API.md` rendered as Next.js route (`/projects/playbook/api`) — or just stays in the GitHub README
- [ ] V2 README opens with a GIF + install command + links to demo + npm
- [ ] Update V1 repo's README with "see V2" notice; archive V1 on GitHub

**Exit criteria:**
- Demo + reference live under the portfolio domain
- V1 repo archived with cross-link
- A new user can learn the library entirely from the playground tutorial

---

## Phase 9 — Publish

**Work:**
- [ ] `npm publish --access public` → `@connorburns/playbook`
- [ ] Tag `v1.0.0` release on GitHub
- [ ] Update LinkedIn + portfolio entry

---

## Decisions log

All initial open questions resolved. See [CLAUDE.md](CLAUDE.md) for the full set of locked technical decisions. Append new decisions here as they're made during execution.

| Date | Decision | Why |
|------|----------|-----|
| 2026-05-19 | Phase 5 feature → JSON export/import | Pairs naturally with the playground for shareable demo URLs |
| 2026-05-19 | Repo strategy → standalone V2, linked from Next.js portfolio | Cleaner "before/after" story, simpler npm publishing |
| 2026-05-19 | npm name → `@connorburns/playbook` | Dropped "fb" prefix; shorter, modern, football specificity is implied by the field rendering |
| 2026-05-19 | No logo / brand mark | README GIF carries it |
| 2026-05-19 | Rename `FbPlaybook` / `playBook` → `Playbook` everywhere in V2 | Consistency with new npm name; `PlayDisplayer` stays as-is |
| 2026-05-19 | Docs = playground tutorial + one `API.md` reference | Higher impact per hour vs. multi-page docs site; matches modern library convention (svelte/vue/solid) |

---

## Working notes

Free-form scratch pad. Drop notes here as decisions evolve — "tried X, didn't work because Y, switched to Z." Future Claude sessions read this to understand why things are the way they are.

### 2026-05-19 — Animation impl: layout offsets → transforms

Switched `animateInSequence` from animating `top/bottom/left/right` to animating `transform: translate(...)`. Originally framed as a fix for "edges of the player circles clipping during motion," but user verified that wasn't real clipping — every ancestor has `overflow: visible`, the circles remain 35×35 squares throughout. The perceived clipping was an **optical artifact**: black circles on a similarly-dark-green field have very low edge contrast, JPEG/AA smear the perimeter, and when a circle sits on a flex row seam the eye reads it as a flat edge.

Transform impl is still a net upgrade (compositor-thread, no per-frame reflow, smoother) so kept it. MoveStep schema unchanged — the `{top|bottom|left|right: N}` data is translated into `translate(x, y)` at animation time. Sign convention: `bottom` and `right` are negative on the translate axis.

### 2026-05-19 — CSS brittleness: player sizing in flex rows ✅ partial fix

`.player-large` is `width/height: 35px` with `margin: 5px` and (originally) `align-self: stretch`, sitting inside `.front-large` / `.mid-back-large` which are `height: 35px` flex rows. The `align-self: stretch` was a no-op today but a single CSS edit away from squashing the players into ellipses (any change that shortens the row or changes box-sizing). Same story for the xx-large variant at 50×50 in 50px rows.

**Resolution (Phase 1 pull-forward):** dropped `align-self: stretch` from `.player` and `.player-large`. Explicit width/height now pin the box shape unambiguously. Still owed for Phase 2: switching the flex rows from fixed `height` to `min-height` and using container queries.

### 2026-05-19 — Perceived edge-clipping at rest ✅ partial fix

Player circles read as "clipped" optically because of low contrast on the dark-green field — JPEG/AA smearing at the perimeter, plus circles sitting on row seams read as flat edges. (Verified by Claude in Chrome: no actual clipping anywhere in the DOM tree.)

**Resolution (Phase 1 pull-forward):** added `box-shadow: 0 0 0 1px white` to `.player` and `.player-large`. Adds a 1px white ring outside each circle, respects `border-radius`, doesn't affect box size. Instantly raises perimeter contrast without needing the full Phase 2 redesign.

Still owed for Phase 2:
- Lighten the field color (proper football-field green, not pure `green`)
- Add yard-line / hash-mark SVG markings (already in the Phase 2 list)
- Reconsider whether the white outline is still needed once the field is redesigned

### 2026-05-19 — Phase 2 wrap-up: Lighthouse breakdown

Final Lighthouse scores against the Vite dev server:
- Accessibility: **96** ✅ (Phase 2 strict criterion ≥ 95 met)
- Best Practices: **100** ✅
- SEO: **92** ✅
- Performance: **69** 🟡

The Performance score is held back by three things the *library* doesn't control:
1. The demo loads ~8 large unoptimized images from third-party hosts (i.ibb.co, dummies.com, etc.). These are the LCP killer.
2. DOM size hovers near Lighthouse's 1,500-node warning threshold because of the 3 sandboxes × 11 selects × 27 options ≈ 890 option nodes alone.
3. Vite dev mode overhead — un-minified modules, HMR injection. `npm run build && vite preview` would score higher.

These are **demo concerns, not library concerns**. The library ships as `dist/index.js` at 5.49 KB gzipped with no runtime perf issues. Consumers who `npm install @connorburns/playbook` never see these images or the giant sandbox DOM — they just get the typed module. Worth doing later as a Phase 2.5 demo polish: trim showcase sections, replace external images with local optimized SVGs, run Lighthouse against the production build.

### 2026-05-19 — Animation perf: transforms vs layout offsets (revisited)

Phase 2 confirmed the transform-based animation approach pays off in practice — animations on the now-fluid field stay smooth at every viewport because transforms compose with the parent's `scale()` without invalidating layout. If we'd kept `top/bottom/left/right` animations, every responsive resize would have required recomputing offsets relative to the new field size.

### 2026-05-19 — Phase 3 design decisions

A few non-obvious calls made during Phase 3 brainstorming that future Claude sessions should respect rather than re-litigate:

**Save button placement: stays in the book taskbar.** Briefly considered moving it to the field's controls bar (`A`) or the bottom of the sandbox (`B`). Settled on `C` (current position) once we decided to ship the connected layout — visual adjacency from the connected layout means the book's taskbar is right next to the field, no scroll required, save destination visible. Without the connected layout, B would be the better placement (linear top-to-bottom workflow). With it, C is the right call architecturally (Playbook owns its own save) AND ergonomically (button is right there next to the field). If the connected layout is ever removed, revisit.

**Connected layout: opt-in library helper, not enforced.** Headless mental model wins for the core classes — `PlayDisplayer` and `Playbook` stay ignorant of each other's layout. The connected layout is a separate helper (`createConnectedLayout`) that does pure DOM scaffolding + ships supporting CSS. Three reasons:
1. Devs who want custom layouts can ignore the helper entirely; existing constructor APIs are unchanged
2. Library doesn't couple the widgets (Playbook doesn't need to know about PlayDisplayer's DOM position)
3. Playground demos (Phase 4) read cleaner with `createConnectedLayout()` than with manual HTML scaffolding

**Single-page book mode: container-query-driven, not viewport.** The book reads its own container's width and decides 1- vs 2-page on its own. Decoupled from the outer layout, so it works whether the book is inside the connected layout's narrow column OR in a standalone deployment with a constrained parent. One responsive behavior, contextually self-aware.

**Full-setup helper (`createPlaybook`) deferred to Phase 5.** (Was Phase 4 before the Phase 4 polish/UX insertion.) Tempting to ship in Phase 3 but the right API shape depends on what the playground's other showcase snippets need. Premature commitment risks designing the wrong shape. Phase 5 starts with playground content, then we decide whether the right top-level helper is "everything in one call" or "compose from smaller pieces."

### 2026-05-29 — Phase 4 design decisions

**Save button placement REVERSED → next to Name input (option B).** Phase 3 settled it at option C (book taskbar) on the reasoning that the connected layout made the book's taskbar visually adjacent to the field. That was true at the time. What changed in Phase 4 Part A: the equal-height "rectangle" layout shrank the right column's overall height so the bottom of the sandbox now sits roughly mid-page rather than far below the field — and the Name input row was a lonely full-width text field with no adjacent action. Moving Save next to Name made the editor pane self-contained (compose → name → commit, all in one column, top-to-bottom reading order), let the book taskbar become pure navigation, and gave the orphaned Name input row a partner. The auto-flip-to-new-page-on-save still works the same; the book reacts to an external trigger now, which actually feels *more* satisfying than clicking save inside the book itself. If this layout is ever undone, revisit again — without the equal-height rectangle, the linear-pane argument weakens.

**Equal-height rectangle: right column drives height, not book.** With `align-items: stretch` alone, the taller column dictates and the shorter one stretches with dead space at the end. The book's two 4:3 stacked pages are nearly always taller than field+sandbox, so without intervention the right column would stretch into dead space below the sandbox. Fix: `align-self: start` on the main column (so its measured size is its natural content height), ResizeObserver in `layout.ts` publishes that height as `--pb-connected-main-h` on the layout root, book column reads it as `max-height`, and the page-image flex chain shrinks the images to fit. Result: both columns end at the right column's natural height; book pages letterbox via `object-fit: contain` to preserve aspect. A pure-CSS attempt without the observer doesn't work — CSS has no expression for "match the *other* sibling's natural height as a cap on *my* height."

**Animation completion = Promise.all of per-player promises, not duration math.** When wiring the Phase 4 Part C playback-mode guards, the obvious-looking implementation is `setTimeout(maxDurationAcrossAllPlayers)` to flip Play back on. Don't do that. `animateInSequence` is already `async` and awaits each `animation.finished`, so the per-player call returns a Promise that resolves when that player's full step chain finishes. Collecting them with `Promise.all` correctly handles four things we'd otherwise have to hand-roll: (1) `prefers-reduced-motion` snaps and resolves instantly, (2) no-op steps that get skipped don't count toward duration, (3) cancellation rejects the Promise cleanly so the catch path re-enables Play, and (4) the browser knows exactly when the last frame painted whereas a duration timer is off by 1 frame. Same conceptual result, no math to get wrong. Side benefit: this is the same Promise shape that `field.play(): Promise<void>` exposes publicly, so the playground gets `await field.play()` for free.

### 2026-05-30 — API smell: `addPage(..., moves: MoveName[])` positional array

`Playbook.addPage(image, title, video, moves)` takes the moves arg as an
11-entry positional array indexed by `POSITIONS` order
(`lte, lt, lg, c, rg, rt, rte, qb, lhb, fb, rhb`). Surfaced while building
the portfolio prototype's snippet #4 — even with a friendly variable name
the call site reads as a wall of `'none'` for sparse plays, and there's
no autocomplete on which slot you're filling.

```ts
// today
book.addPage(img, 'Hail Mary Out', vid, [
  'straight-deep', 'mid-90-left', 'none', 'none', 'none',
  'mid-90-right', 'straight-deep', 'pass-qb',
  'none', 'hole-four-fb', 'none',
]);

// cleaner shape
book.addPage(img, 'Hail Mary Out', vid, {
  lte: 'straight-deep', lt: 'mid-90-left',
  rt: 'mid-90-right', rte: 'straight-deep',
  qb: 'pass-qb', fb: 'hole-four-fb',
});
```

**Fix shape (when picked up):** widen the signature to
`MoveName[] | Partial<Record<Position, MoveName>> | null`, normalize to
the existing internal array form inside `addPage`. Backwards-compatible
— the array form (used by every demo + every test today) keeps working;
new code adopts the partial-record form. ~15 lines in `playbook.ts` plus
a test that asserts both shapes produce the same saved page.

Deferred: this is a library DX fix, doesn't belong on the
`portfolio-prototype` branch. **Now folded into Phase 4.5 (Tier 2)** — the
hardening pass that runs before the playground writes a lot of `addPage`
calls against the current shape.

### 2026-05-30 — Phase 4.5 Tier 3 (lifecycle / teardown)

**`destroy()`, single name, idempotent.** PLAN floated "`destroy()` /
`dispose()`" — picked one (`destroy()`) per class plus a `destroy()` member
on the `createConnectedLayout` return object, rather than shipping aliases.
One name to document, one to test. Every `destroy()` guards on a `destroyed`
flag and returns early on the second call so React StrictMode's deliberate
mount→unmount→remount double-invoke (and any re-entrant unmount) is safe.

**Ownership rule: destroy only what you constructed.** `Playbook.destroy()`
does **not** destroy its connected `PlayDisplayer`. A field can be shared
across books or owned by the page, so tearing it down from the book would be
a surprise. The book only releases the subscriptions *it* registered on the
field (the per-page Initialize-Play playback subs, now captured into
`fieldSubs` instead of fire-and-forget). Same logic for `createConnectedLayout`'s
disposer: it removes its own scaffold + observer but leaves the widgets
mounted in its slots alone. A Next.js route unmount calls all three in turn.

**Sandbox tracking.** Sandboxes mount into an arbitrary `parentId`, so the
displayer couldn't otherwise find them at teardown. Added a `sandboxes: HTMLDivElement[]`
that `spawnSandbox` pushes to and `destroy()` removes. The existing
`sandboxSelectGroups` only held `<select>` refs for state-sync, not the shells.

**Testing observers in jsdom.** jsdom ships no `ResizeObserver`, so the
constructors' observer setup is normally skipped entirely. The lifecycle
tests install a tracking stub on `globalThis` in `beforeEach` (removed in
`afterEach`) that counts `observe`/`disconnect`, letting us assert the full
mount→destroy cycle disconnects exactly the observers it created (2: field
stage + layout main column). Bundle after Tier 1–3: **9.25 KB gzipped**
(still under the 10 KB budget).

### 2026-05-30 — Phase 4.5 Tier 4 (hygiene / polish) — Phase 4.5 complete

Closed out the hardening pass with the opportunistic cleanups. No behavior
change — pure refactor + a couple of dev-ergonomics fixes.

**`buildPage` → `src/page.ts` `Page` class.** The one genuinely
hard-to-follow spot. Closure state (`currentImage`, `currentVideoLink`,
`videoEditorOpen`) became fields; `renderImage` / `renderVideoSection`
became methods that read those fields instead of capturing locals. The book
stays the owner of navigation + the connected field; `Page` only renders
itself and (when wired) loads its moves back via Initialize Play. The
field-sub capture still flows through `registerFieldSub` so `Playbook.destroy()`
releases it exactly as before. `Playbook.buildPage` is now a ~10-line wrapper
around `new Page({...}).element`, so the two call sites (`addPage`,
`saveFieldStateAsPage`) didn't change.

**`getMove` overload retired.** `PlayDisplayer.getMove(pos)` (assigned move
for a position) shared a name with the imported `getMove(name, size)`
(catalog lookup) — same identifier, different meaning, inside the same file.
Renamed the method to `getAssignedMove`. Only one internal caller
(`snapshotFieldMoves`) + the tests referenced it; the V2 demo doesn't.

**Magic numbers hoisted.** Field natural widths now `FIELD_NATURAL_WIDTH`
in `moves.ts` (all per-size dimensions in one file). Image `400×300` now
`PAGE_IMAGE_WIDTH`/`PAGE_IMAGE_HEIGHT` in `page.ts`, used by both the live
page renderer and the seed-page builder.

**Casts:** narrowed `reader.result` with a `typeof` guard; deliberately
*kept* `select.value as MoveName` — it's a real DOM boundary, the options
are catalog-only, and `setMove` already warns on unknown names, so a guard
there would be redundant.

Green across the board: typecheck clean, **49/49 tests** (was 49 — no test
count change; the rename touched existing assertions, the extraction is
covered by the existing page/save tests), build clean, bundle **9.58 KB
gzipped** (up 0.33 from Tier 3's 9.25 — the `Page` class adds a little
structure; still under the 10 KB budget). Phase 4.5 done; next is Phase 5
(Playground MVP).

### 2026-05-30 — Full `src/` read-through → Phase 4.5

Read all 8 files in `src/` end-to-end (`index`, `types`, `moves`,
`displayer`, `playbook`, `animation`, `dom`, `layout`) looking for code
smells / poor API ergonomics beyond the `addPage` one above. Findings
written up as **Phase 4.5** (tiered Footguns → API shape → Lifecycle →
Hygiene). Headlines: (1) DOM IDs built from the user `name` collide across
instances — `layout.ts` already has the right counter pattern; (2) three
silent-fallback paths (`setMove` unknown move, `mountInto` bad parent,
`addPage` short array) that hide typos; (3) zero teardown anywhere — no
`destroy()`, observers/subs never released — which will leak on every
Next.js route mount/unmount (the port is Task 3). `moves.ts` /
`animation.ts` / `types.ts` came out clean; no enum changes needed (string
unions are already idiomatic).
