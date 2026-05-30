/**
 * Connected layout — opt-in DOM scaffolding for the common
 * "book + field + sandbox" composition.
 *
 * The headless mental model is preserved: PlayDisplayer and Playbook
 * stay ignorant of each other's positions. This helper is pure DOM
 * scaffolding that returns slot IDs developers pass to the existing
 * constructors. The matching CSS (`.pb-connected-layout`) ships in
 * `styles.css` and handles the wide-vs-stacked breakpoint.
 *
 * @example
 *   const layout = createConnectedLayout('my-section');
 *   const field  = new PlayDisplayer({ size: 'large', name: 'X', parentId: layout.fieldSlot });
 *   const book   = new Playbook({ title: 'X', field, allowSave: true, parentId: layout.bookSlot });
 *   field.spawnSandbox(true, layout.sandboxSlot);
 *
 * Behavior:
 *   - >= 1400px viewport: book column on the left, field-then-sandbox
 *     stacked on the right. Book column is narrow (~400px) so the
 *     book auto-switches to single-page mode (see `.pages-container`
 *     @container rule). The conjoined unit is visually obvious.
 *   - < 1400px:           everything stacks vertically. Book sits full-
 *                         width in its column → renders two pages.
 */

import { createDiv, mountInto } from './dom.js';

export interface ConnectedLayout {
  /** ID of the div to pass to `new PlayDisplayer(...).parentId`. */
  fieldSlot: string;
  /** ID of the div to pass to `field.spawnSandbox(allowSave, parentId)`. */
  sandboxSlot: string;
  /** ID of the div to pass to `new Playbook(...).parentId`. */
  bookSlot: string;
}

let counter = 0;

/**
 * Build the connected-layout scaffold under `parentId` (or `document.body`
 * if null/undefined). Returns three slot IDs. Each call generates fresh
 * unique IDs so multiple connected layouts can coexist on the same page.
 */
export function createConnectedLayout(parentId?: string | null): ConnectedLayout {
  counter += 1;
  const suffix = String(counter);

  const wrap = createDiv('pb-connected-layout');

  const bookCol = createDiv('pb-connected-layout__book');
  bookCol.id = `pb-book-slot-${suffix}`;

  const mainCol = createDiv('pb-connected-layout__main');

  const fieldSlot = createDiv('pb-connected-layout__field');
  fieldSlot.id = `pb-field-slot-${suffix}`;

  const sandboxSlot = createDiv('pb-connected-layout__sandbox');
  sandboxSlot.id = `pb-sandbox-slot-${suffix}`;

  mainCol.append(fieldSlot, sandboxSlot);
  wrap.append(bookCol, mainCol);

  mountInto(wrap, parentId);

  // Drive the row's height off the main column's natural height. Without
  // this, the book's two stacked pages (sized by 4:3 image aspect-ratio)
  // are usually taller than field+sandbox, so `align-items: stretch` pulls
  // the right column up to the book's height and leaves dead space below
  // the sandbox. We measure the main column (which has `align-self: start`
  // in the wide media query, so its measured size = natural size) and
  // expose it as `--pb-connected-main-h` on the wrap; the book column
  // reads it as a max-height and the equalize rules shrink its pages to
  // fit. No-op below the 1400px breakpoint — the layout is stacked, the
  // CSS var is just unused. Falls back gracefully if ResizeObserver isn't
  // available (SSR / very old browsers): heights stay un-synced, no crash.
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        if (h > 0) wrap.style.setProperty('--pb-connected-main-h', `${h}px`);
      }
    });
    ro.observe(mainCol);
  }

  return {
    fieldSlot: fieldSlot.id,
    sandboxSlot: sandboxSlot.id,
    bookSlot: bookCol.id,
  };
}
