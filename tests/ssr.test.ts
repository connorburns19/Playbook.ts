/**
 * SSR / hydration tests — five families from the spec (Hydrate.md §7):
 *
 * 1. Parity     — render*HTML output matches build().root.outerHTML (same markup)
 * 2. Behavioral — hydrated widget is fully interactive (Play, Reset, setMove)
 * 3. No rebuild — existing DOM nodes are adopted, not replaced
 * 4. Server-safe — render*HTML works with document undefined (no DOM access)
 * 5. Destroy    — destroy() after hydrate is idempotent and cleans up correctly
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  Playbook,
  PlayDisplayer,
  hydrateConnectedLayout,
  renderConnectedLayoutHTML,
  renderPlaybookHTML,
  renderPlayDisplayerHTML,
  renderSandboxHTML,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise an HTML string for structural parity comparison:
 *   - Parse via jsdom innerHTML so attribute order is consistent
 *   - Strip JS-wired dynamic state (disabled, title, visibility) from buttons —
 *     these are applied by wire() after both build and adopt paths, so they are
 *     NOT part of the structural markup the renderer should match.
 */
function normalizeForParity(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('button').forEach((btn) => {
    btn.removeAttribute('disabled');
    btn.removeAttribute('title');
    btn.style.removeProperty('visibility');
    if (!btn.getAttribute('style')) btn.removeAttribute('style');
  });
  return tmp.firstElementChild?.outerHTML ?? html;
}

/** Reduced-motion matchMedia stub — makes animateInSequence snap synchronously. */
const reducedMotionStub = (query: string) => ({
  matches: query.includes('prefers-reduced-motion'),
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});

// ---------------------------------------------------------------------------
// ResizeObserver stub (jsdom ships none)
// ---------------------------------------------------------------------------

let observeCount = 0;
let disconnectCount = 0;

class MockResizeObserver {
  observe(): void {
    observeCount++;
  }
  disconnect(): void {
    disconnectCount++;
  }
  unobserve(): void {}
}

// ---------------------------------------------------------------------------
// 1. Parity tests
// ---------------------------------------------------------------------------

describe('SSR parity — renderPlayDisplayerHTML matches build outerHTML', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    observeCount = 0;
    disconnectCount = 0;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    // @ts-expect-error — remove stub
    delete globalThis.ResizeObserver;
  });

  it('matches for size=large with no name', () => {
    const opts = { size: 'large' as const };
    const field = new PlayDisplayer({ ...opts, parentId: 'root' });
    const domHTML = normalizeForParity(field.root.outerHTML);
    const renderedHTML = normalizeForParity(renderPlayDisplayerHTML(opts));
    expect(renderedHTML).toBe(domHTML);
  });

  it('matches for size=large with a name', () => {
    const opts = { size: 'large' as const, name: 'Spread Right' };
    const field = new PlayDisplayer({ ...opts, parentId: 'root' });
    const domHTML = normalizeForParity(field.root.outerHTML);
    const renderedHTML = normalizeForParity(renderPlayDisplayerHTML(opts));
    expect(renderedHTML).toBe(domHTML);
  });

  it('matches for size=xx-large', () => {
    const opts = { size: 'xx-large' as const, name: 'Power I' };
    const field = new PlayDisplayer({ ...opts, parentId: 'root' });
    const domHTML = normalizeForParity(field.root.outerHTML);
    const renderedHTML = normalizeForParity(renderPlayDisplayerHTML(opts));
    expect(renderedHTML).toBe(domHTML);
  });

  it('renderer emits all 11 data-position hooks', () => {
    const html = renderPlayDisplayerHTML({ size: 'large' });
    for (const pos of ['lte', 'lt', 'lg', 'c', 'rg', 'rt', 'rte', 'qb', 'lhb', 'fb', 'rhb']) {
      expect(html).toContain(`data-position="${pos}"`);
    }
  });

  it('renderer emits control hooks for play and reset', () => {
    const html = renderPlayDisplayerHTML({ size: 'large' });
    expect(html).toContain('data-pb-control="play"');
    expect(html).toContain('data-pb-control="reset"');
  });

  it('renderer emits stage/inner/field-top role hooks', () => {
    const html = renderPlayDisplayerHTML({ size: 'large' });
    expect(html).toContain('data-pb-role="stage"');
    expect(html).toContain('data-pb-role="inner"');
    expect(html).toContain('data-pb-role="field-top"');
  });

  it('renderer emits the default --pb-field-scale:1 inline style', () => {
    const html = renderPlayDisplayerHTML({ size: 'large' });
    expect(html).toContain('--pb-field-scale:1');
  });
});

// ---------------------------------------------------------------------------
// 2. Behavioral tests — hydrated widget is fully interactive
// ---------------------------------------------------------------------------

describe('PlayDisplayer.hydrate — behavioral', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    observeCount = 0;
    disconnectCount = 0;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: reducedMotionStub,
    });
  });

  afterEach(() => {
    // @ts-expect-error — remove stub
    delete globalThis.ResizeObserver;
  });

  function injectAndHydrate(opts: { size: 'large' | 'xx-large'; name?: string }): PlayDisplayer {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlayDisplayerHTML(opts);
    return PlayDisplayer.hydrate(root.firstElementChild as HTMLElement, opts);
  }

  it('setMove wires up correctly after hydration', () => {
    const field = injectAndHydrate({ size: 'large' });
    expect(field.hasAnyMoves).toBe(false);
    field.setMove('qb', 'pass-qb');
    expect(field.getAssignedMove('qb')).toBe('pass-qb');
    expect(field.hasAnyMoves).toBe(true);
  });

  it('Play button is disabled initially (no moves)', () => {
    injectAndHydrate({ size: 'large' });
    const playBtn = document.querySelector<HTMLButtonElement>('[data-pb-control="play"]')!;
    expect(playBtn.disabled).toBe(true);
  });

  it('Play button enables after setMove', () => {
    const field = injectAndHydrate({ size: 'large' });
    const playBtn = document.querySelector<HTMLButtonElement>('[data-pb-control="play"]')!;
    field.setMove('qb', 'pass-qb');
    expect(playBtn.disabled).toBe(false);
  });

  it('Reset button is hidden initially', () => {
    injectAndHydrate({ size: 'large' });
    const resetBtn = document.querySelector<HTMLButtonElement>('[data-pb-control="reset"]')!;
    expect(resetBtn.style.visibility).toBe('hidden');
  });

  it('playback state transitions work after hydration', async () => {
    const field = injectAndHydrate({ size: 'large' });
    field.setMove('qb', 'pass-qb');
    const states: string[] = [];
    field.onPlaybackStateChange((s) => states.push(s));
    await field.play();
    expect(states).toContain('playing');
    expect(states).toContain('played');
  });

  it('setFieldName updates the field-top element', () => {
    const field = injectAndHydrate({ size: 'large', name: 'Test' });
    field.setFieldName('Hail Mary');
    // Use field.fieldTop directly — the authoritative reference set by adoptRefs().
    expect(field.fieldTop.textContent).toBe('Hail Mary');
  });

  it('ResizeObserver is started on hydration', () => {
    injectAndHydrate({ size: 'large' });
    expect(observeCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. No-rebuild tests — existing DOM nodes are adopted, not replaced
// ---------------------------------------------------------------------------

describe('PlayDisplayer.hydrate — no node recreation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    // @ts-expect-error — remove stub
    delete globalThis.ResizeObserver;
  });

  it('adopts the root element (same reference)', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlayDisplayerHTML({ size: 'large' });
    const preHydrateRoot = root.firstElementChild as HTMLElement;
    const field = PlayDisplayer.hydrate(preHydrateRoot, { size: 'large' });
    expect(field.root).toBe(preHydrateRoot);
  });

  it('adopts player elements — data-test-marker survives hydration', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlayDisplayerHTML({ size: 'large' });
    const qbEl = root.querySelector('[data-position="qb"]')!;
    qbEl.setAttribute('data-test-marker', 'sentinel');

    PlayDisplayer.hydrate(root.firstElementChild as HTMLElement, { size: 'large' });

    const qbAfter = document.querySelector('[data-position="qb"]')!;
    expect(qbAfter.getAttribute('data-test-marker')).toBe('sentinel');
    expect(qbAfter).toBe(qbEl);
  });

  it('player count stays at 11 after hydration (no extras created)', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlayDisplayerHTML({ size: 'large' });
    PlayDisplayer.hydrate(root.firstElementChild as HTMLElement, { size: 'large' });
    expect(document.querySelectorAll('[data-position]').length).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// Sandbox parity + hydration
// ---------------------------------------------------------------------------

describe('SSR structural parity — renderSandboxHTML', () => {
  // Structural (not byte-for-byte) checks: the critical invariant is that
  // adoptRefs can find every element it needs. Full HTML equality is skipped
  // for sandbox because jsdom serialises <option> text inconsistently between
  // createElement and innerHTML-parsed paths.

  it('emits all 11 data-position select hooks', () => {
    const html = renderSandboxHTML({ size: 'large', idPrefix: 'x' });
    for (const pos of ['lte', 'lt', 'lg', 'c', 'rg', 'rt', 'rte', 'qb', 'lhb', 'fb', 'rhb']) {
      expect(html).toContain(`data-position="${pos}"`);
    }
  });

  it('emits correct label/select id pairs for idPrefix', () => {
    const html = renderSandboxHTML({ size: 'large', idPrefix: 'myprefix' });
    expect(html).toContain('for="pb-select-qb-myprefix"');
    expect(html).toContain('id="pb-select-qb-myprefix"');
  });

  it('emits .pb-sandbox-rename when allowSave is true', () => {
    const html = renderSandboxHTML({ size: 'large', idPrefix: 'x', allowSave: true });
    expect(html).toContain('pb-sandbox-rename');
    expect(html).toContain('aria-label="Play name"');
  });

  it('does NOT emit .pb-sandbox-rename when allowSave is false', () => {
    const html = renderSandboxHTML({ size: 'large', idPrefix: 'x', allowSave: false });
    expect(html).not.toContain('pb-sandbox-rename');
  });

  it('emits sandbox-large for size=large, sandbox for size=xx-large', () => {
    expect(renderSandboxHTML({ size: 'large', idPrefix: 'x' })).toContain('class="sandbox-large"');
    expect(renderSandboxHTML({ size: 'xx-large', idPrefix: 'x' })).toContain('class="sandbox"');
  });
});

describe('Sandbox.spawnSandbox hydrate path — behavioral', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="sb"></div>';
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    // @ts-expect-error — remove stub
    delete globalThis.ResizeObserver;
  });

  it('adopted sandbox select change fires setMove', () => {
    const sbContainer = document.getElementById('sb')!;
    sbContainer.innerHTML = renderSandboxHTML({ size: 'large', idPrefix: 'h1' });
    const shell = sbContainer.firstElementChild as HTMLElement;

    const field = new PlayDisplayer({ size: 'large', parentId: 'root' });
    field.spawnSandbox(false, null, null, 'h1', shell);

    const qbSelect = shell.querySelector<HTMLSelectElement>('select[data-position="qb"]')!;
    qbSelect.value = 'pass-qb';
    qbSelect.dispatchEvent(new Event('change'));

    expect(field.getAssignedMove('qb')).toBe('pass-qb');
  });

  it('adopted sandbox select is synced when setMove is called externally', () => {
    const sbContainer = document.getElementById('sb')!;
    sbContainer.innerHTML = renderSandboxHTML({ size: 'large', idPrefix: 'h2' });
    const shell = sbContainer.firstElementChild as HTMLElement;

    const field = new PlayDisplayer({ size: 'large', parentId: 'root' });
    field.spawnSandbox(false, null, null, 'h2', shell);

    field.setMove('qb', 'pass-qb');

    const qbSelect = shell.querySelector<HTMLSelectElement>('select[data-position="qb"]')!;
    expect(qbSelect.value).toBe('pass-qb');
  });

  it('adopted sandbox node is not recreated', () => {
    const sbContainer = document.getElementById('sb')!;
    sbContainer.innerHTML = renderSandboxHTML({ size: 'large', idPrefix: 'h3' });
    const shell = sbContainer.firstElementChild as HTMLElement;
    shell.setAttribute('data-test-marker', 'original');

    const field = new PlayDisplayer({ size: 'large', parentId: 'root' });
    field.spawnSandbox(false, null, null, 'h3', shell);

    expect(shell.getAttribute('data-test-marker')).toBe('original');
    expect(sbContainer.children.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Playbook SSR + hydration
// ---------------------------------------------------------------------------

const SAMPLE_PAGES = [
  { image: null, title: 'Hail Mary', moves: ['straight-deep', 'none', 'none', 'none', 'none', 'none', 'straight-deep', 'pass-qb', 'none', 'none', 'none'] as const },
  { image: null, title: 'Power I', moves: null },
];

describe('renderPlaybookHTML — structural', () => {
  it('emits nav hooks for back/forward', () => {
    const html = renderPlaybookHTML({ title: 'Test', pages: [] });
    expect(html).toContain('data-pb-nav="back"');
    expect(html).toContain('data-pb-nav="forward"');
  });

  it('emits left/right slot role hooks', () => {
    const html = renderPlaybookHTML({ title: 'Test', pages: [] });
    expect(html).toContain('data-pb-role="left-slot"');
    expect(html).toContain('data-pb-role="right-slot"');
  });

  it('includes page-data container with page markup', () => {
    const html = renderPlaybookHTML({ title: 'Book', pages: SAMPLE_PAGES as never });
    expect(html).toContain('pb-book-page-data');
    expect(html).toContain('data-pb-page-index="0"');
    expect(html).toContain('data-pb-page-index="1"');
  });

  it('escapes special characters in title', () => {
    const html = renderPlaybookHTML({ title: 'A & B <test>', pages: [] });
    expect(html).toContain('Playbook: A &amp; B &lt;test&gt;');
  });

  it('server-safe — runs without document', () => {
    const savedDoc = globalThis.document;
    // @ts-expect-error — simulate no-DOM server environment
    delete globalThis.document;
    try {
      const html = renderPlaybookHTML({ title: 'Test', pages: [] });
      expect(typeof html).toBe('string');
      expect(html).toContain('pages-container');
    } finally {
      globalThis.document = savedDoc;
    }
  });
});

describe('Playbook.hydrate — behavioral', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: reducedMotionStub,
    });
  });

  afterEach(() => {
    // @ts-expect-error — remove stub
    delete globalThis.ResizeObserver;
  });

  function injectAndHydrateBook(opts: Parameters<typeof renderPlaybookHTML>[0] & { field?: PlayDisplayer | null; allowSave?: boolean }): Playbook {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlaybookHTML(opts);
    return Playbook.hydrate(root.firstElementChild as HTMLElement, {
      title: opts.title,
      field: opts.field ?? null,
      allowSave: opts.allowSave ?? false,
      pageOrientation: opts.pageOrientation,
      pages: opts.pages,
    });
  }

  it('adopts root element (same reference)', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlaybookHTML({ title: 'Test', pages: [] });
    const preRoot = root.firstElementChild as HTMLElement;
    const book = Playbook.hydrate(preRoot, { title: 'Test', field: null, allowSave: false, pages: [] });
    expect(book.root).toBe(preRoot);
  });

  it('Forward/Back navigation works after hydration', () => {
    const book = injectAndHydrateBook({
      title: 'Test',
      pages: [
        { image: null, title: 'P1' },
        { image: null, title: 'P2' },
        { image: null, title: 'P3' },
        { image: null, title: 'P4' },
      ],
    });
    const forward = document.querySelector<HTMLButtonElement>('[data-pb-nav="forward"]')!;
    expect((book.root.querySelector('.page-title') as HTMLElement | null)?.innerText).toBe('P1');
    forward.click();
    expect((book.root.querySelector('.page-title') as HTMLElement | null)?.innerText).toBe('P3');
  });

  it('Initialize Play button loads moves onto the field after hydration', () => {
    const field = new PlayDisplayer({ size: 'large', parentId: 'root' });
    const book = injectAndHydrateBook({
      title: 'Test',
      field,
      allowSave: false,
      pages: [{ image: null, title: 'Hail Mary', moves: ['straight-deep', 'none', 'none', 'none', 'none', 'none', 'straight-deep', 'pass-qb', 'none', 'none', 'none'] }],
    });
    void book; // book wires the field
    const initBtn = document.querySelector<HTMLButtonElement>('.link-button')!;
    initBtn.click();
    expect(field.getAssignedMove('qb')).toBe('pass-qb');
    expect(field.getAssignedMove('lte')).toBe('straight-deep');
  });

  it('destroy() removes the book but not the field', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlaybookHTML({ title: 'Test', pages: [] });
    const book = Playbook.hydrate(root.firstElementChild as HTMLElement, {
      title: 'Test', field: null, allowSave: false, pages: [],
    });
    book.destroy();
    expect(document.querySelector('.pages-container')).toBeNull();
  });

  it('data-pb-nav hooks survive (no node recreation)', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlaybookHTML({ title: 'Test', pages: [] });
    const backBtn = root.querySelector('[data-pb-nav="back"]')!;
    backBtn.setAttribute('data-test-marker', 'sentinel');
    Playbook.hydrate(root.firstElementChild as HTMLElement, {
      title: 'Test', field: null, allowSave: false, pages: [],
    });
    expect(document.querySelector('[data-pb-nav="back"]')?.getAttribute('data-test-marker')).toBe('sentinel');
  });
});

// ---------------------------------------------------------------------------
// 4. Server-safe rendering (no DOM)
// ---------------------------------------------------------------------------

describe('renderPlayDisplayerHTML — server-safe (no document)', () => {
  it('produces a string without accessing document', () => {
    const savedDoc = globalThis.document;
    // @ts-expect-error — simulate no-DOM server environment
    delete globalThis.document;
    try {
      const html = renderPlayDisplayerHTML({ size: 'large', name: 'Server Test' });
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('pb-displayer');
    } finally {
      globalThis.document = savedDoc;
    }
  });

  it('escapes special characters in the name', () => {
    const html = renderPlayDisplayerHTML({ size: 'large', name: 'Play <"2024"> & Boom' });
    expect(html).toContain('aria-label="Play displayer: Play &lt;&quot;2024&quot;&gt; &amp; Boom"');
  });
});

// ---------------------------------------------------------------------------
// 5. Destroy after hydration
// ---------------------------------------------------------------------------

describe('PlayDisplayer.hydrate — destroy lifecycle', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    observeCount = 0;
    disconnectCount = 0;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    // @ts-expect-error — remove stub
    delete globalThis.ResizeObserver;
  });

  it('destroy() removes the root from the DOM', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlayDisplayerHTML({ size: 'large' });
    const field = PlayDisplayer.hydrate(root.firstElementChild as HTMLElement, { size: 'large' });
    expect(document.querySelector('.pb-displayer')).toBeTruthy();
    field.destroy();
    expect(document.querySelector('.pb-displayer')).toBeNull();
  });

  it('destroy() disconnects the ResizeObserver', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlayDisplayerHTML({ size: 'large' });
    const field = PlayDisplayer.hydrate(root.firstElementChild as HTMLElement, { size: 'large' });
    expect(disconnectCount).toBe(0);
    field.destroy();
    expect(disconnectCount).toBe(1);
  });

  it('destroy() is idempotent after hydration', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlayDisplayerHTML({ size: 'large' });
    const field = PlayDisplayer.hydrate(root.firstElementChild as HTMLElement, { size: 'large' });
    field.destroy();
    expect(() => field.destroy()).not.toThrow();
    expect(disconnectCount).toBe(1);
  });

  it('destroy() clears subscriptions so post-destroy setMove notifies nobody', () => {
    const root = document.getElementById('root')!;
    root.innerHTML = renderPlayDisplayerHTML({ size: 'large' });
    const field = PlayDisplayer.hydrate(root.firstElementChild as HTMLElement, { size: 'large' });
    let called = 0;
    field.onMovesChange(() => called++);
    called = 0;
    field.destroy();
    field.setMove('qb', 'pass-qb');
    expect(called).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Connected layout — render + hydrateConnectedLayout
// ---------------------------------------------------------------------------

describe('renderConnectedLayoutHTML — structural', () => {
  it('emits the layout wrapper with all three slot divs', () => {
    const { html } = renderConnectedLayoutHTML({ idSuffix: 'test' });
    expect(html).toContain('pb-connected-layout');
    expect(html).toContain('pb-connected-layout__book');
    expect(html).toContain('pb-connected-layout__main');
    expect(html).toContain('pb-connected-layout__field');
    expect(html).toContain('pb-connected-layout__sandbox');
  });

  it('uses the provided idSuffix in slot ids', () => {
    const { html, fieldSlot, sandboxSlot, bookSlot } = renderConnectedLayoutHTML({ idSuffix: 'abc' });
    expect(bookSlot).toBe('pb-book-slot-abc');
    expect(fieldSlot).toBe('pb-field-slot-abc');
    expect(sandboxSlot).toBe('pb-sandbox-slot-abc');
    expect(html).toContain('id="pb-book-slot-abc"');
    expect(html).toContain('id="pb-field-slot-abc"');
    expect(html).toContain('id="pb-sandbox-slot-abc"');
  });

  it('auto-generates unique ids when idSuffix is omitted', () => {
    const a = renderConnectedLayoutHTML();
    const b = renderConnectedLayoutHTML();
    expect(a.bookSlot).not.toBe(b.bookSlot);
  });

  it('server-safe — runs without document', () => {
    const savedDoc = globalThis.document;
    // @ts-expect-error — simulate no-DOM server environment
    delete globalThis.document;
    try {
      const { html } = renderConnectedLayoutHTML({ idSuffix: 'srv' });
      expect(typeof html).toBe('string');
      expect(html).toContain('pb-connected-layout');
    } finally {
      globalThis.document = savedDoc;
    }
  });
});

describe('hydrateConnectedLayout — behavioral', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    observeCount = 0;
    disconnectCount = 0;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    // @ts-expect-error — remove stub
    delete globalThis.ResizeObserver;
  });

  function injectAndHydrate(idSuffix = 'h1') {
    const root = document.getElementById('root')!;
    const { html } = renderConnectedLayoutHTML({ idSuffix });
    root.innerHTML = html;
    return hydrateConnectedLayout(root.firstElementChild as HTMLElement, { idSuffix });
  }

  it('returns the correct slot ids from the existing DOM', () => {
    const layout = injectAndHydrate('s1');
    expect(layout.bookSlot).toBe('pb-book-slot-s1');
    expect(layout.fieldSlot).toBe('pb-field-slot-s1');
    expect(layout.sandboxSlot).toBe('pb-sandbox-slot-s1');
  });

  it('attaches a ResizeObserver to the mainCol', () => {
    injectAndHydrate('s2');
    expect(observeCount).toBe(1);
  });

  it('does not recreate nodes (data-test-marker survives hydration)', () => {
    const root = document.getElementById('root')!;
    const { html } = renderConnectedLayoutHTML({ idSuffix: 's3' });
    root.innerHTML = html;
    const bookCol = root.querySelector('.pb-connected-layout__book')!;
    bookCol.setAttribute('data-test-marker', 'sentinel');
    hydrateConnectedLayout(root.firstElementChild as HTMLElement);
    expect(document.querySelector('.pb-connected-layout__book')?.getAttribute('data-test-marker')).toBe('sentinel');
  });

  it('destroy() disconnects the ResizeObserver', () => {
    const layout = injectAndHydrate('s4');
    expect(disconnectCount).toBe(0);
    layout.destroy();
    expect(disconnectCount).toBe(1);
  });

  it('destroy() removes the scaffold from the DOM', () => {
    const layout = injectAndHydrate('s5');
    expect(document.querySelector('.pb-connected-layout')).toBeTruthy();
    layout.destroy();
    expect(document.querySelector('.pb-connected-layout')).toBeNull();
  });

  it('destroy() is idempotent', () => {
    const layout = injectAndHydrate('s6');
    layout.destroy();
    expect(() => layout.destroy()).not.toThrow();
    expect(disconnectCount).toBe(1);
  });
});
