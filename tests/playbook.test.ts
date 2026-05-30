import { beforeEach, describe, expect, it } from 'vitest';
import { Playbook, PlayDisplayer, createConnectedLayout } from '../src/index.js';

describe('PlayDisplayer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('creates DOM elements for every position', () => {
    new PlayDisplayer({ size: 'large', name: 'Test1', parentId: 'root' });
    expect(document.querySelector('[data-position="lte"]')).toBeTruthy();
    expect(document.querySelector('[data-position="qb"]')).toBeTruthy();
    expect(document.querySelector('[data-position="rhb"]')).toBeTruthy();
  });

  it('defaults every position to "none"', () => {
    const f = new PlayDisplayer({ size: 'large', name: 'Test2', parentId: 'root' });
    expect(f.getMove('lte')).toBe('none');
    expect(f.getMove('qb')).toBe('none');
    expect(f.getMove('rhb')).toBe('none');
  });

  it('setMove assigns a known move', () => {
    const f = new PlayDisplayer({ size: 'large', name: 'Test3', parentId: 'root' });
    f.setMove('qb', 'pass-qb');
    expect(f.getMove('qb')).toBe('pass-qb');
  });

  it('setMove("none") clears assignment', () => {
    const f = new PlayDisplayer({ size: 'large', name: 'Test4', parentId: 'root' });
    f.setMove('qb', 'pass-qb');
    f.setMove('qb', 'none');
    expect(f.getMove('qb')).toBe('none');
  });

  it('setFieldName updates the header text', () => {
    const f = new PlayDisplayer({ size: 'large', name: 'Test5', parentId: 'root' });
    f.setFieldName('Hail Mary');
    expect(f.fieldTop.innerText).toBe('Hail Mary');
  });

  it('reset cancels all animations on player elements', () => {
    const f = new PlayDisplayer({ size: 'large', name: 'Test6', parentId: 'root' });
    f.setMove('qb', 'pass-qb');
    // Calling reset on a non-animating field should not throw.
    expect(() => f.reset()).not.toThrow();
  });

  it('spawnSandbox appends a sandbox UI under the field', () => {
    const f = new PlayDisplayer({ size: 'large', name: 'Test7', parentId: 'root' });
    const sandbox = f.spawnSandbox(false, 'root');
    expect(sandbox).toBeTruthy();
    expect(document.querySelector('.forms2')).toBeTruthy();
  });
});

describe('Playbook', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts a pages-container element', () => {
    new Playbook({ title: 'Test', field: null, allowSave: false, parentId: 'root' });
    expect(document.querySelector('.pages-container')).toBeTruthy();
  });

  it('starts empty by default (no seed pages, no surprise network requests)', () => {
    new Playbook({ title: 'Test', field: null, allowSave: false, parentId: 'root' });
    expect(document.querySelectorAll('.page-content').length).toBe(0);
  });

  it('seedPages renders static intro pages up front', () => {
    new Playbook({
      title: 'Test',
      parentId: 'root',
      seedPages: [
        { image: 'cover.png', title: 'Cover' },
        { image: 'intro.png', title: 'Instructions' },
      ],
    });
    const imgs = document.querySelectorAll('.page-content img.page-image');
    expect(imgs.length).toBe(2);
    expect((imgs[0] as HTMLImageElement).getAttribute('src')).toBe('cover.png');
    expect((imgs[0] as HTMLImageElement).alt).toBe('Cover');
  });

  it('addPage adds a new page (visible after a flip)', () => {
    const book = new Playbook({ title: 'Test', field: null, allowSave: false, parentId: 'root' });
    book.addPage('img.png', 'Title');
    book.addPage('img2.png', 'Title2');
    // 2 pages total (empty book + 2 added). Both render at once in jsdom's
    // two-page mode; the Forward click is a no-op here but kept for parity.
    const forwardBtn = document.querySelector('.right-button');
    (forwardBtn as HTMLButtonElement).click();
    const titles = Array.from(document.querySelectorAll('.page-title')).map(
      (el) => (el as HTMLElement).innerText,
    );
    expect(titles).toContain('Title');
    expect(titles).toContain('Title2');
  });

  it('Initialize Play button loads the move list onto the connected field', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'Hooked', parentId: 'root' });
    const book = new Playbook({ title: 'Hooked', field: field, allowSave: false, parentId: 'root' });
    book.addPage('img.png', 'My Play', null, [
      'pass-qb', 'none', 'none', 'none', 'none', 'none', 'none', 'pass-qb',
      'none', 'none', 'none',
    ]);
    // Flip to the new page so the Initialize button is mounted
    const forwardBtn = document.querySelector('.right-button');
    (forwardBtn as HTMLButtonElement).click();
    const initBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText === 'Initialize Play',
    );
    expect(initBtn).toBeTruthy();
    initBtn?.click();
    // 'pass-qb' on lte isn't valid for that position semantically, but setMove
    // doesn't enforce position-specific rules — it should still get assigned.
    expect(field.getMove('lte')).toBe('pass-qb');
    expect(field.getMove('qb')).toBe('pass-qb');
    expect(field.fieldTop.innerText).toBe('My Play');
  });

  it('developer-added pages stay read-only even when allowSave is true', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'DevPage', parentId: 'root' });
    const book = new Playbook({ title: 'Test', field: field, allowSave: true, parentId: 'root' });
    book.addPage('img.png', 'Preloaded', 'https://youtu.be/x', [
      'pass-qb', 'none', 'none', 'none', 'none', 'none', 'none',
      'pass-qb', 'none', 'none', 'none',
    ]);

    // Flip to the developer-added page.
    const forwardBtn = document.querySelector('.right-button') as HTMLButtonElement;
    forwardBtn.click();

    // No per-page edit affordances — preloaded plays are the developer's
    // "official content," not user-editable.
    const replaceBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText === 'Replace image',
    );
    expect(replaceBtn).toBeFalsy();
    const editLink = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText === 'Edit link',
    );
    expect(editLink).toBeFalsy();
  });

  it('Save to Book button adds a page with current field state and no image', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'TestSave', parentId: 'root' });
    field.setMove('qb', 'pass-qb');
    const book = new Playbook({ title: 'Test', field: field, allowSave: true, parentId: 'root' });
    field.spawnSandbox(true, 'root', book.createSaveButton());

    const saveBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText === 'Save to Book',
    ) as HTMLButtonElement | undefined;
    expect(saveBtn).toBeTruthy();
    saveBtn!.click();

    // The saved page is the book's only page (no seed pages); saving already
    // flipped to it. The Forward click is a harmless no-op.
    const forwardBtn = document.querySelector('.right-button') as HTMLButtonElement;
    forwardBtn.click();

    // Saved page should render the "no image" placeholder + "+ Add image" affordance.
    expect(document.querySelector('.page-image-placeholder')).toBeTruthy();
    const addImg = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText === '+ Add image',
    );
    expect(addImg).toBeTruthy();
    const addVid = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText === '+ Add video link',
    );
    expect(addVid).toBeTruthy();
  });
});

describe('PlayDisplayer playback state', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    // jsdom doesn't implement `Element.animate`. Force reduced-motion so
    // `animateInSequence` takes the synchronous snap branch instead — same
    // code path real users with that OS pref hit; lets these tests focus
    // on the state machine and UI wiring rather than WAAPI plumbing.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it('starts in idle with Reset hidden; Play disabled until a move is set', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB1', parentId: 'root' });
    expect(field.playbackState).toBe('idle');
    const buttons = field.root.querySelectorAll('.pb-controls button');
    const playBtn = buttons[0] as HTMLButtonElement;
    const resetBtn = buttons[1] as HTMLButtonElement;
    // No moves yet → Play locked, contextual title explains why.
    expect(playBtn.disabled).toBe(true);
    expect(playBtn.title).toBe('Set a move using a dropdown first');
    expect(resetBtn.style.visibility).toBe('hidden');
    // Set a move → Play unlocks, title clears.
    field.setMove('qb', 'pass-qb');
    expect(playBtn.disabled).toBe(false);
    expect(playBtn.title).toBe('');
  });

  it('play() returns a Promise<void> that resolves and leaves state in "played"', async () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB2', parentId: 'root' });
    const result = await field.play();
    expect(result).toBeUndefined();
    expect(field.playbackState).toBe('played');
  });

  it('transitions idle -> playing -> played and notifies subscribers (immediate + transitions)', async () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB3', parentId: 'root' });
    const states: string[] = [];
    field.onPlaybackStateChange((s) => states.push(s));
    // subscribe fires immediately with the current state
    expect(states).toEqual(['idle']);
    await field.play();
    expect(states).toEqual(['idle', 'playing', 'played']);
  });

  it('Play button is disabled while playing, re-enabled after (with a move set)', async () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB4', parentId: 'root' });
    field.setMove('qb', 'pass-qb'); // so Play isn't locked by the no-moves rule
    const playBtn = field.root.querySelector('.pb-controls button') as HTMLButtonElement;
    expect(playBtn.disabled).toBe(false);
    let disabledDuringPlay = false;
    field.onPlaybackStateChange((s) => {
      if (s === 'playing') disabledDuringPlay = playBtn.disabled;
    });
    await field.play();
    expect(disabledDuringPlay).toBe(true);
    expect(playBtn.disabled).toBe(false);
  });

  it('Reset becomes visible after play and hides again after reset()', async () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB5', parentId: 'root' });
    const buttons = field.root.querySelectorAll('.pb-controls button');
    const resetBtn = buttons[1] as HTMLButtonElement;
    expect(resetBtn.style.visibility).toBe('hidden');
    await field.play();
    expect(resetBtn.style.visibility).toBe('visible');
    field.reset();
    expect(field.playbackState).toBe('idle');
    expect(resetBtn.style.visibility).toBe('hidden');
  });

  it('sandbox dropdowns lock while playing, unlock after', async () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB6', parentId: 'root' });
    field.spawnSandbox(false, 'root');
    const qbSelect = document.querySelector('select[data-position="qb"]') as HTMLSelectElement;
    expect(qbSelect.disabled).toBe(false);
    let disabledDuringPlay = false;
    field.onPlaybackStateChange((s) => {
      if (s === 'playing') disabledDuringPlay = qbSelect.disabled;
    });
    await field.play();
    expect(disabledDuringPlay).toBe(true);
    expect(qbSelect.disabled).toBe(false);
  });

  it('per-page Initialize Play button locks while playing, unlocks after', async () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB7', parentId: 'root' });
    const book = new Playbook({ title: 'PB7Book', field: field, allowSave: false, parentId: 'root' });
    book.addPage(
      null,
      'TestPlay',
      null,
      ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'],
    );
    // Flip to the new page (jsdom: pageStep === 2, page index 2 is our addition).
    const forwardBtn = book.root.querySelector('.right-button') as HTMLButtonElement;
    forwardBtn.click();
    const initBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText === 'Initialize Play',
    ) as HTMLButtonElement | undefined;
    expect(initBtn).toBeTruthy();
    let disabledDuringPlay = false;
    field.onPlaybackStateChange((s) => {
      if (s === 'playing') disabledDuringPlay = initBtn!.disabled;
    });
    await field.play();
    expect(disabledDuringPlay).toBe(true);
    expect(initBtn!.disabled).toBe(false);
  });

  it('unsubscribe stops further state notifications', async () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB8', parentId: 'root' });
    const states: string[] = [];
    const unsub = field.onPlaybackStateChange((s) => states.push(s));
    expect(states).toEqual(['idle']);
    unsub();
    await field.play();
    expect(states).toEqual(['idle']);
  });

  it('concurrent play() calls return the same in-flight Promise', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB9', parentId: 'root' });
    field.setMove('qb', 'pass-qb');
    const p1 = field.play();
    const p2 = field.play();
    expect(p1).toBe(p2);
  });

  it('hasAnyMoves reflects whether any position has a move assigned', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB10', parentId: 'root' });
    expect(field.hasAnyMoves).toBe(false);
    field.setMove('qb', 'pass-qb');
    expect(field.hasAnyMoves).toBe(true);
    field.setMove('qb', 'none');
    expect(field.hasAnyMoves).toBe(false);
  });

  it('clearing the last move re-disables Play', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB11', parentId: 'root' });
    const playBtn = field.root.querySelector('.pb-controls button') as HTMLButtonElement;
    field.setMove('qb', 'pass-qb');
    expect(playBtn.disabled).toBe(false);
    field.setMove('qb', 'none');
    expect(playBtn.disabled).toBe(true);
    expect(playBtn.title).toBe('Set a move using a dropdown first');
  });

  it('onMovesChange fires immediately on subscribe, then on each setMove', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'PB12', parentId: 'root' });
    let count = 0;
    const unsub = field.onMovesChange(() => {
      count += 1;
    });
    expect(count).toBe(1); // immediate sync
    field.setMove('qb', 'pass-qb');
    expect(count).toBe(2);
    field.setMove('lhb', 'hole-one-lhb');
    expect(count).toBe(3);
    unsub();
    field.setMove('rhb', 'hole-five-rhb');
    expect(count).toBe(3); // unsubscribed
  });
});

describe('Reactive sandbox', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('changing a sandbox dropdown immediately updates field state (no Confirm step)', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'ReactiveSandbox', parentId: 'root' });
    field.spawnSandbox(false, 'root');

    const qbSelect = document.querySelector(
      'select[data-position="qb"]',
    ) as HTMLSelectElement;
    expect(qbSelect).toBeTruthy();

    qbSelect.value = 'pass-qb';
    qbSelect.dispatchEvent(new Event('change'));

    expect(field.getMove('qb')).toBe('pass-qb');
  });

  it('typing in the rename input live-updates the field header (no Set button)', () => {
    const field = new PlayDisplayer({ size: 'large', name: 'ReactiveName', parentId: 'root' });
    field.spawnSandbox(true, 'root');

    const nameInput = document.querySelector(
      '.pb-sandbox-rename input[type="text"]',
    ) as HTMLInputElement;
    expect(nameInput).toBeTruthy();

    nameInput.value = 'My Custom Play';
    nameInput.dispatchEvent(new Event('input'));

    expect(field.fieldTop.innerText).toBe('My Custom Play');
  });
});

describe('pageOrientation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('defaults to horizontal (data-orientation attribute reflects)', () => {
    const book = new Playbook({ title: 'Default', field: null, allowSave: false, parentId: 'root' });
    expect(book.pageOrientation).toBe('horizontal');
    expect(book.root.dataset.orientation).toBe('horizontal');
  });

  it('accepts pageOrientation via options object', () => {
    const book = new Playbook({
      title: 'Vertical',
      pageOrientation: 'vertical',
      parentId: 'root',
    });
    expect(book.pageOrientation).toBe('vertical');
    expect(book.root.dataset.orientation).toBe('vertical');
  });
});

describe('createConnectedLayout', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts a scaffold under the parent and returns three unique slot IDs', () => {
    const layout = createConnectedLayout('root');

    expect(document.querySelector('.pb-connected-layout')).toBeTruthy();
    expect(document.querySelector('.pb-connected-layout__book')).toBeTruthy();
    expect(document.querySelector('.pb-connected-layout__field')).toBeTruthy();
    expect(document.querySelector('.pb-connected-layout__sandbox')).toBeTruthy();

    expect(layout.bookSlot).toBeTruthy();
    expect(layout.fieldSlot).toBeTruthy();
    expect(layout.sandboxSlot).toBeTruthy();
    expect(new Set([layout.bookSlot, layout.fieldSlot, layout.sandboxSlot]).size).toBe(3);
  });

  it('widgets mount into the layout slots end-to-end', () => {
    const layout = createConnectedLayout('root');
    const field = new PlayDisplayer({ size: 'large', name: 'X', parentId: layout.fieldSlot });
    const book = new Playbook({ title: 'X', field: field, allowSave: true, parentId: layout.bookSlot });
    field.spawnSandbox(true, layout.sandboxSlot);

    // The book lives inside the book slot, the field inside the field slot, etc.
    const bookContainer = document.getElementById(layout.bookSlot);
    const fieldContainer = document.getElementById(layout.fieldSlot);
    const sandboxContainer = document.getElementById(layout.sandboxSlot);

    expect(bookContainer?.querySelector('.pages-container')).toBe(book.root);
    expect(fieldContainer?.querySelector('.pb-displayer')).toBe(field.root);
    expect(sandboxContainer?.querySelector('.sandbox-large, .sandbox')).toBeTruthy();
  });

  it('multiple layouts on the same page have unique IDs', () => {
    const a = createConnectedLayout('root');
    const b = createConnectedLayout('root');

    expect(a.bookSlot).not.toBe(b.bookSlot);
    expect(a.fieldSlot).not.toBe(b.fieldSlot);
    expect(a.sandboxSlot).not.toBe(b.sandboxSlot);
  });
});
