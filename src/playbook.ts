/**
 * `Playbook` — flippable two-page book of plays, optionally wired to a `PlayDisplayer`.
 *
 * V2 / Phase 3 UX overhaul:
 *   - Unified save: the Save button is the only way for end-users to save. It
 *     adds a page with current field state + name, leaving image and video blank.
 *   - Per-page edit affordances (when `allowSave: true`): each page renders
 *     "+ Add image" / "+ Add video link" buttons when those slots are empty,
 *     and small "Replace image" / "Edit link" buttons when they're filled.
 *   - Image uploads via a file picker (FileReader → data URL). No URL paste,
 *     no backend — `data:` URLs are just strings, so they round-trip through
 *     JSON export the same way https URLs do.
 *   - `allowUserCreatePlays()` removed. Its functionality is now subsumed by
 *     the per-page edit affordances on saved plays.
 */

import { createButton, createDiv, mountInto } from './dom.js';
import { Page, buildDefaultPage } from './page.js';
import type { MoveName, PageData, PageMoves } from './types.js';
import { POSITIONS } from './types.js';
import type { PlayDisplayer } from './displayer.js';

/**
 * How the book's two page slots are arranged.
 *   - `'horizontal'` (default): side-by-side spread. The book auto-switches
 *     to single-page mode when its container is narrower than ~500 px
 *     (see `.pages-container` `@container` rule). Classic book metaphor.
 *   - `'vertical'`: pages stacked top-to-bottom, both always visible. Useful
 *     when the book sits in a tall narrow column (e.g. inside the connected
 *     layout). No responsive single-page switch.
 */
export type PageOrientation = 'horizontal' | 'vertical';

export interface PlaybookOptions {
  title: string;
  field?: PlayDisplayer | null;
  allowSave?: boolean;
  parentId?: string | null;
  pageOrientation?: PageOrientation;
  /**
   * Static intro pages to seed the book with (e.g. a cover + instructions).
   * Rendered image-only — `image` is the source, `title` is used as alt text;
   * `videoLink`/`moves` are ignored. Omit for an empty book. The library no
   * longer ships any hardcoded image URLs, so seeding is fully opt-in.
   */
  seedPages?: PageData[];
}

export class Playbook {
  readonly title: string;
  readonly field: PlayDisplayer | null;
  readonly allowSave: boolean;
  readonly pageOrientation: PageOrientation;
  /** Outer container appended to the parent at construction time. */
  readonly root: HTMLDivElement;

  private readonly pages: HTMLDivElement[] = [];
  private currentPageIndex = 0;
  private readonly leftSlot: HTMLDivElement;
  private readonly rightSlot: HTMLDivElement;
  private currentLeft: HTMLDivElement | null = null;
  private currentRight: HTMLDivElement | null = null;
  /**
   * Unsubscribe handles for the playback subscriptions this book registers on
   * the connected field (one per page with an Initialize Play button). Released
   * by `destroy()` so the book doesn't keep the field — or detached pages —
   * alive after unmount.
   */
  private readonly fieldSubs: Array<() => void> = [];
  /** Set once `destroy()` runs so the instance is inert and the call is idempotent. */
  private destroyed = false;

  constructor(options: PlaybookOptions) {
    this.title = options.title;
    this.field = options.field ?? null;
    this.allowSave = options.allowSave ?? false;
    this.pageOrientation = options.pageOrientation ?? 'horizontal';

    // Optional intro pages (e.g. cover / instructions). Off by default so a
    // fresh book makes no surprise third-party network request and can be
    // genuinely empty. Rendered image-only (title used as alt text); for
    // editable or field-connected pages, use addPage after construction.
    for (const seed of options.seedPages ?? []) {
      this.pages.push(buildDefaultPage(seed.image, seed.title));
    }

    const container = createDiv('pages-container');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', `Playbook: ${this.title || 'untitled'}`);
    container.dataset.orientation = this.pageOrientation;

    // Single taskbar above the page slots. Holds Back / Title / Forward —
    // pure navigation. The Save button is no longer here; consumers mount
    // it next to their compose UI via `createSaveButton()` so the commit
    // action lives at the natural end of the editor workflow.
    const taskbar = createDiv('pb-book-taskbar');
    const backBtn = createButton('left-button', 'Back');
    taskbar.append(backBtn);

    const titleEl = createDiv('title');
    titleEl.innerText = this.title;
    taskbar.append(titleEl);

    const forwardBtn = createButton('right-button', 'Forward');
    taskbar.append(forwardBtn);

    container.append(taskbar);

    // Pages row: two slots side-by-side by default. The right slot is
    // CSS-hidden when the .pages-container element is narrower than
    // ~500px (@container query). Navigation step adapts via `pageStep`.
    const pagesRow = createDiv('pb-book-pages');
    this.leftSlot = createDiv('page-item');
    this.rightSlot = createDiv('page-item');
    pagesRow.append(this.leftSlot, this.rightSlot);
    container.append(pagesRow);

    this.renderCurrentPages();

    forwardBtn.addEventListener('click', () => this.goForward());
    backBtn.addEventListener('click', () => this.goBack());

    this.root = container;
    mountInto(container, options.parentId);
  }

  /**
   * Append a new play to the book. `image` may be `null` — when `allowSave` is
   * true, the page renders a "+ Add image" placeholder users can fill in later.
   * `videoLink` works the same way.
   *
   * If a `field` is connected and `moves` is provided, the page also includes an
   * "Initialize Play" button that loads those moves into the field. `moves` may
   * be an array in `POSITIONS` order or a partial `{ position: move }` map (see
   * `PageMoves`); either way it's normalized to one entry per position.
   */
  addPage(
    image: string | null,
    title: string,
    videoLink?: string | null,
    moves?: PageMoves | null,
  ): void {
    // Developer-added pages are read-only — only user-saved plays (via the
    // Save button → saveFieldStateAsPage) get the per-page edit affordances.
    this.attachPage(
      this.buildPage(image, title, videoLink ?? null, normalizePageMoves(moves), /* editable */ false),
    );
  }

  /**
   * Build a button bound to this book's save-field-as-page action. Returns
   * `null` when there's no connected field or `allowSave` is false (saving
   * would be a no-op). Mount the returned button next to the compose UI —
   * typically into the sandbox's name row via `spawnSandbox(..., saveBtn)`.
   */
  createSaveButton(label: string = 'Save to Book'): HTMLButtonElement | null {
    if (!this.field || !this.allowSave) return null;
    const btn = createButton('pb-save-button', label);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveFieldStateAsPage();
    });
    return btn;
  }

  /**
   * Tear down this book: release every playback subscription registered on the
   * connected field, drop page references, and remove the book from the DOM.
   * Idempotent. The connected `field` is *not* destroyed — it can be shared or
   * owned elsewhere; destroy it separately via `field.destroy()`.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    for (const unsub of this.fieldSubs) unsub();
    this.fieldSubs.length = 0;

    this.pages.length = 0;
    this.currentLeft = null;
    this.currentRight = null;
    this.root.remove();
  }

  private attachPage(page: HTMLDivElement): void {
    this.pages.push(page);
    const index = this.pages.length - 1;

    // Render immediately if the new page lands in a currently-empty visible
    // slot. The left-slot case matters now that books can start empty (no seed
    // pages): without it, a book's very first page would sit in `pages` unseen
    // until the next navigation. Seeded books already filled both slots in the
    // constructor, so later additions fall through to a no-op here (correct —
    // they live on a later spread reached by Back/Forward).
    if (index === this.currentPageIndex && !this.currentLeft) {
      this.currentLeft = page;
      this.leftSlot.append(page);
    } else if (index === this.currentPageIndex + 1 && !this.currentRight) {
      this.currentRight = page;
      this.rightSlot.append(page);
    }
  }

  // --- internals ---

  /**
   * Build a play page with optional per-page edit affordances. Reusable across
   * developer-added plays (editable = false) and user-saved plays (editable =
   * true). `editable` gates the Add/Replace image button and the Add/Edit
   * video link button independently of the book-level `allowSave` flag.
   *
   * The rendering lives in `Page` (see `page.ts`); this wires it to the book's
   * connected field and captures the field subscription so `destroy()` can
   * release it.
   */
  private buildPage(
    initialImage: string | null,
    title: string,
    initialVideoLink: string | null,
    moves: MoveName[] | null,
    editable: boolean,
  ): HTMLDivElement {
    return new Page({
      image: initialImage,
      title,
      videoLink: initialVideoLink,
      moves,
      editable,
      field: this.field,
      registerFieldSub: (unsub) => this.fieldSubs.push(unsub),
    }).element;
  }

  private snapshotFieldMoves(): MoveName[] {
    if (!this.field) return POSITIONS.map(() => 'none');
    return POSITIONS.map((pos) => this.field!.getAssignedMove(pos));
  }

  private saveFieldStateAsPage(): void {
    if (!this.field) return;
    const moves = this.snapshotFieldMoves();
    const title = this.field.fieldTop.innerText.trim() || 'Untitled Play';
    // image + videoLink start as null; user fills them in via per-page edit.
    // editable=true because this is a user-created play.
    this.attachPage(this.buildPage(null, title, null, moves, /* editable */ true));
    // Auto-flip so the user sees their freshly-saved page (essential in
    // single-page mode, nice feedback in two-page mode too).
    this.flipToPage(this.pages.length - 1);
  }

  /**
   * How many pages each Back/Forward click moves through.
   *
   * Two-page mode (book width >= 500px): step by 2 — Back/Forward flips a
   * pair at a time, classic book-spread navigation.
   *
   * Single-page mode (book width < 500px): step by 1 — only one page is
   * visible (right slot CSS-hidden by @container query), so flipping by 2
   * would skip over pages.
   *
   * `clientWidth === 0` happens in jsdom (no layout engine). Default to
   * two-page mode so unit tests get the standard flow without mocks.
   */
  private get pageStep(): number {
    // Vertical orientation always shows both pages stacked — flip by 2.
    if (this.pageOrientation === 'vertical') return 2;
    const w = this.root?.clientWidth ?? 0;
    if (w === 0) return 2;
    return w < 500 ? 1 : 2;
  }

  private renderCurrentPages(): void {
    this.currentLeft?.remove();
    this.currentRight?.remove();
    this.currentLeft = this.pages[this.currentPageIndex] ?? null;
    this.currentRight = this.pages[this.currentPageIndex + 1] ?? null;
    if (this.currentLeft) this.leftSlot.append(this.currentLeft);
    if (this.currentRight) this.rightSlot.append(this.currentRight);
  }

  private goForward(): void {
    const step = this.pageStep;
    if (this.currentPageIndex + step > this.pages.length - 1) return;
    this.currentPageIndex += step;
    this.renderCurrentPages();
  }

  private goBack(): void {
    const step = this.pageStep;
    if (this.currentPageIndex - step < 0) return;
    this.currentPageIndex -= step;
    this.renderCurrentPages();
  }

  /** Jump directly to a target page index, snapping to a valid pair start
   *  in two-page mode so the target lands on the left slot. */
  private flipToPage(index: number): void {
    const lastValid = Math.max(0, this.pages.length - 1);
    const clamped = Math.max(0, Math.min(index, lastValid));
    const step = this.pageStep;
    const target = step === 2 ? Math.floor(clamped / 2) * 2 : clamped;
    this.currentPageIndex = target;
    this.renderCurrentPages();
  }
}

/**
 * Normalize `addPage`'s flexible `moves` input to a length-11 array in
 * `POSITIONS` order (or `null` when no moves were given). Accepts either an
 * ordered array or a partial `{ position: move }` map. The array form warns
 * (but doesn't throw) on a wrong length so a miscount surfaces instead of
 * silently blanking or dropping positions.
 */
function normalizePageMoves(moves: PageMoves | null | undefined): MoveName[] | null {
  if (moves == null) return null;
  if (Array.isArray(moves)) {
    if (moves.length !== POSITIONS.length) {
      console.warn(
        `[playbook] addPage: expected ${POSITIONS.length} moves in POSITIONS order, got ${moves.length}; missing positions default to 'none' and extras are ignored.`,
      );
    }
    return POSITIONS.map((_pos, i) => moves[i] ?? 'none');
  }
  return POSITIONS.map((pos) => moves[pos] ?? 'none');
}
