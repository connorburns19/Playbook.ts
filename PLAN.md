# Playbook — V2 Modernization Plan

Forward-looking roadmap for revamping the original 2021 school project (`FbPlaybook.js`) into a modern, typed, npm-publishable library named `Playbook`. See [CLAUDE.md](CLAUDE.md) for what the project *is* and the locked technical decisions.

This file is the **single source of truth for where the project is going**. Update the checkboxes as phases complete — future Claude sessions read this file to know where work should pick up.

---

## Status overview

- [x] **Phase 1** — Library foundation (rename, refactor, drop jQuery, TS) ✅
- [ ] **Phase 2** — Visual modernization (CSS, responsive)
- [ ] **Phase 3** — Playground MVP (editor + iframe preview)
- [ ] **Phase 4** — Playground polish (snippets, shareable URLs)
- [ ] **Phase 5** — Extension feature (JSON export/import)
- [ ] **Phase 6** — Docs + portfolio integration
- [ ] **Phase 7** — Publish to npm

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
- [ ] New design tokens (CSS custom properties) — retire lightslategrey/green/thistle
- [ ] Responsive units / container queries — kill the fixed 854px/1220px widths
- [ ] Mobile breakpoint: field gracefully shrinks below 768px
- [ ] Modern typography (system stack)
- [ ] Field gets actual football markings (yard lines, hashes) as SVG background
- [ ] Sandbox forms redesigned with proper labels, layout, spacing
- [ ] Dark mode via `prefers-color-scheme`

**Exit criteria:**
- Side-by-side V1 vs V2 screenshot is a clear "before/after"
- Lighthouse accessibility ≥ 95
- Works on phone, tablet, desktop

---

## Phase 3 — Playground MVP

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

## Phase 4 — Playground polish

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

## Phase 5 — Extension feature: JSON export/import

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

## Phase 6 — Docs + portfolio integration

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

## Phase 7 — Publish

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
