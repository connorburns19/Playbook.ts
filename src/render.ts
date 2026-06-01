/**
 * Pure server-side HTML renderers for Playbook widgets.
 *
 * These functions produce the exact same markup structure as the widget
 * constructors' `buildRefs()` methods — verified by the parity tests in
 * `tests/ssr.test.ts`. They have **zero DOM access** and run in any server
 * runtime (Node, Edge, Deno).
 *
 * Usage (Next.js RSC or getServerSideProps):
 *   const html = renderPlayDisplayerHTML({ size: 'large', name: 'My Play' });
 *   // pass html as dangerouslySetInnerHTML; then in a useEffect:
 *   PlayDisplayer.hydrate(rootEl, { size: 'large', name: 'My Play' });
 */

import type {
  ConnectedLayoutHTMLResult,
  ConnectedLayoutSSROptions,
  PageData,
  PlaybookSSROptions,
  PlayDisplayerSSROptions,
  SandboxSSROptions,
} from './types.js';
import { POSITIONS, POSITION_FULL_NAMES, POSITION_LABELS } from './types.js';
import { KNOWN_MOVE_NAMES } from './moves.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a string for safe interpolation into an HTML attribute value (double-quoted). */
function ea(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape a string for safe interpolation into HTML text content. */
function et(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// PlayDisplayer
// ---------------------------------------------------------------------------

/**
 * Render a `PlayDisplayer` as an HTML string. The output is byte-equivalent
 * (modulo whitespace) to `new PlayDisplayer(options).root.outerHTML` for the
 * same options. No DOM is accessed.
 *
 * Known limitation: the renderer emits `--pb-field-scale:1` as the initial
 * inline scale. When hydrated, `PlayDisplayer` will call `applyScale()` once
 * synchronously and start a ResizeObserver. On narrow viewports this causes a
 * single-frame scale correction (the field snaps from 1 to actual). A CSS-only
 * scaling follow-up would eliminate this residual jump.
 */
export function renderPlayDisplayerHTML(options: PlayDisplayerSSROptions): string {
  const { size, name } = options;
  const s = size === 'large' ? '-large' : '';
  const ariaName = ea(name || 'unnamed');

  const frontPositions = ['lte', 'lt', 'lg', 'c', 'rg', 'rt', 'rte'] as const;
  const backPositions = ['lhb', 'fb', 'rhb'] as const;

  const playerHTML = (pos: (typeof POSITIONS)[number]): string =>
    `<div class="player${s}" data-position="${pos}" aria-label="${POSITION_FULL_NAMES[pos]}" role="img"><span>${POSITION_LABELS[pos]}</span></div>`;

  return (
    `<div class="pb-displayer" data-size="${size}" role="region" aria-label="Play displayer: ${ariaName}">` +
    `<div class="pb-field-stage" data-size="${size}" data-pb-role="stage">` +
    `<div class="pb-field-inner" data-pb-role="inner" style="--pb-field-scale:1">` +
    `<div class="field-top${s}" data-pb-role="field-top"></div>` +
    `<div class="field${s}">` +
    `<div class="front${s}">` +
    frontPositions.map(playerHTML).join('') +
    `</div>` +
    `<div class="mid-back${s}">` +
    playerHTML('qb') +
    `</div>` +
    `<div class="mid-back${s}">` +
    backPositions.map(playerHTML).join('') +
    `</div>` +
    `</div>` + // .field
    `</div>` + // .pb-field-inner
    `</div>` + // .pb-field-stage
    `<div class="pb-controls">` +
    `<button type="button" data-pb-control="play" disabled="">Play Animation</button>` +
    `<button type="button" data-pb-control="reset" style="visibility: hidden;">Reset</button>` +
    `</div>` + // .pb-controls
    `</div>` // .pb-displayer
  );
}

// ---------------------------------------------------------------------------
// Sandbox
// ---------------------------------------------------------------------------

/**
 * Render a sandbox (dropdown UI) as an HTML string.
 *
 * `idPrefix` must be the same value passed to `spawnSandbox(allowSave, parentId,
 * saveButton, idPrefix)` at hydration time — this ensures the server-rendered
 * `<label htmlFor>` / `<select id>` pairs survive hydration without mismatch.
 */
export function renderSandboxHTML(options: SandboxSSROptions): string {
  const { size, idPrefix } = options;
  const cls = size === 'large' ? 'sandbox-large' : 'sandbox';

  const optionsHTML =
    `<option value="none">none</option>` +
    KNOWN_MOVE_NAMES.map((n) => `<option value="${n}">${n}</option>`).join('');

  const rows = POSITIONS.map((pos) => {
    const id = `pb-select-${pos}-${idPrefix}`;
    return (
      `<label for="${id}">${POSITION_LABELS[pos]}: </label>` +
      `<select id="${id}" name="${POSITION_LABELS[pos]}" data-position="${pos}">` +
      optionsHTML +
      `</select>`
    );
  }).join('');

  const nameWrapHTML = options.allowSave
    ? `<div class="pb-sandbox-rename">` +
      `<input type="text" placeholder="Name this play" aria-label="Play name">` +
      `<button type="button" class="pb-save-button" data-pb-role="save-placeholder" disabled="">Save to Book</button>` +
      `</div>`
    : '';

  return `<div class="${cls}"><div class="forms2">${rows}</div>${nameWrapHTML}</div>`;
}

// ---------------------------------------------------------------------------
// Playbook
// ---------------------------------------------------------------------------

/**
 * Render a `Playbook` as an HTML string. All pages must be declared up-front
 * via `options.pages` (there is no `addPage` at SSR time).
 */
export function renderPlaybookHTML(options: PlaybookSSROptions): string {
  const { title, pageOrientation = 'horizontal', pages } = options;

  const renderPageHTML = (page: PageData, i: number): string => {
    const imageHTML = page.image
      ? `<img class="page-image" src="${ea(page.image)}" alt="${ea(page.title)}" width="400" height="300" loading="lazy" decoding="async">`
      : `<div class="page-image-placeholder">${page.editable ? 'No image yet' : 'No image'}</div>`;

    const videoHTML = page.videoLink
      ? `<a href="${ea(page.videoLink)}" target="_blank" rel="noopener noreferrer" class="link-button">Open Video</a>` +
        (page.editable ? `<button type="button" class="page-edit-btn">Edit link</button>` : '')
      : page.editable
        ? `<button type="button" class="page-edit-btn">+ Add video link</button>`
        : '';

    const initBtnHTML =
      page.moves && page.moves.length > 0
        ? `<button type="button" class="link-button">Initialize Play</button>`
        : '';

    const imageEditHTML = page.editable
      ? `<button type="button" class="page-edit-btn">${page.image ? 'Replace image' : '+ Add image'}</button>` +
        `<input type="file" accept="image/*" aria-label="Upload play image" hidden>`
      : '';

    const titleEditable = page.editable ? ` contenteditable="true" spellcheck="false"` : '';

    return (
      `<div class="page-content" data-pb-page-index="${i}">` +
      `<div class="page-image-section">${imageHTML}</div>` +
      `<div class="page-title"${titleEditable}>${et(page.title)}</div>` +
      `<div class="page-actions">` +
      initBtnHTML +
      `<div class="page-video-section">${videoHTML}</div>` +
      imageEditHTML +
      `</div>` +
      `</div>`
    );
  };

  // Generate each page's HTML individually so slots can be pre-populated
  // without string-slicing (which risks starting mid-tag).
  const pageHTMLs = pages.map(renderPageHTML);
  const pagesHTML = pageHTMLs.join('');

  return (
    `<div class="pages-container" role="region" aria-label="Playbook: ${ea(title || 'untitled')}" data-orientation="${pageOrientation}">` +
    `<div class="pb-book-taskbar">` +
    `<button type="button" class="left-button" data-pb-nav="back" style="visibility: hidden;">Back</button>` +
    `<div class="title">${et(title)}</div>` +
    `<button type="button" class="right-button" data-pb-nav="forward" style="visibility: hidden;">Forward</button>` +
    `</div>` +
    `<div class="pb-book-pages">` +
    `<div class="page-item" data-pb-role="left-slot">${pageHTMLs[0] ?? ''}</div>` +
    `<div class="page-item" data-pb-role="right-slot">${pageHTMLs[1] ?? ''}</div>` +
    `</div>` +
    `<div class="pb-book-page-data" hidden>` +
    pagesHTML +
    `</div>` +
    `</div>`
  );
}

// ---------------------------------------------------------------------------
// Connected layout
// ---------------------------------------------------------------------------

let renderCounter = 0;

/**
 * Render the connected layout scaffold as an HTML string. Returns slot IDs
 * alongside the HTML so the caller can pass them to the widget constructors.
 *
 * `options.idSuffix` must match the suffix used in `hydrateConnectedLayout`
 * so slot IDs agree between server and client. When omitted, an auto-counter
 * is used (safe for client-only rendering, not for SSR hydration).
 */
export function renderConnectedLayoutHTML(
  options: ConnectedLayoutSSROptions = {},
): ConnectedLayoutHTMLResult {
  const suffix = options.idSuffix ?? String((renderCounter += 1));

  const bookSlot = `pb-book-slot-${suffix}`;
  const fieldSlot = `pb-field-slot-${suffix}`;
  const sandboxSlot = `pb-sandbox-slot-${suffix}`;

  const html =
    `<div class="pb-connected-layout">` +
    `<div class="pb-connected-layout__book" id="${bookSlot}"></div>` +
    `<div class="pb-connected-layout__main">` +
    `<div class="pb-connected-layout__field" id="${fieldSlot}"></div>` +
    `<div class="pb-connected-layout__sandbox" id="${sandboxSlot}"></div>` +
    `</div>` +
    `</div>`;

  return { html, fieldSlot, sandboxSlot, bookSlot };
}
