# Playbook API Reference

Quick-reference for `@connorburns/playbook`. See the playground demos for
runnable examples; this file covers signatures, options, and valid values.

---

## `PlayDisplayer`

Renders an 11-player offensive formation on a green field with Web Animations
API-powered route animation.

### Constructor

```ts
new PlayDisplayer(options: PlayDisplayerOptions)
```

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `size` | `'large' \| 'xx-large'` | required | Field dimensions |
| `name` | `string` | `''` | Label shown above the field |
| `parentId` | `string \| null` | `null` | DOM id to mount into (appends to `document.body` if omitted) |

### Methods

```ts
setMove(position: Position, move: MoveName): void
getAssignedMove(position: Position): MoveName
resetAllMoves(): void
setFieldName(name: string): void
spawnSandbox(allowSave?: boolean, parentId?: string | null, saveButton?: HTMLButtonElement | null, idPrefix?: string): HTMLElement
onMovesChange(cb: () => void): () => void          // returns unsubscribe fn
onPlaybackStateChange(cb: (s: PlaybackState) => void): () => void
destroy(): void
```

### Properties

```ts
readonly root: HTMLElement           // outer container
readonly hasAnyMoves: boolean        // true when at least one position has a non-'none' move
readonly fieldTop: HTMLElement       // label element above the field
```

### `PlaybackState`

```ts
type PlaybackState = 'idle' | 'playing' | 'finished';
```

### Static hydration

```ts
PlayDisplayer.hydrate(root: HTMLElement, options: Omit<PlayDisplayerOptions, 'parentId'>): PlayDisplayer
```

Adopts a server-rendered `PlayDisplayer` root (no node re-creation). See
[SSR / hydration](#ssr--hydration) below.

---

## `Playbook`

A flippable two-page "book" of plays, optionally connected to a
`PlayDisplayer`.

### Constructor

```ts
new Playbook(options: PlaybookOptions)
```

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `title` | `string` | required | Displayed in the taskbar |
| `field` | `PlayDisplayer \| null` | `null` | Connected displayer |
| `allowSave` | `boolean` | `false` | Enable Save-to-book |
| `parentId` | `string \| null` | `null` | DOM id to mount into |
| `pageOrientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Page layout |
| `seedPages` | `PageData[]` | `[]` | Read-only intro pages |

### Methods

```ts
addPage(image: string | null, title: string, videoLink?: string | null, moves?: PageMoves | null): void
createSaveButton(label?: string): HTMLButtonElement | null
destroy(): void
```

### Properties

```ts
readonly root: HTMLElement
readonly title: string
readonly field: PlayDisplayer | null
readonly allowSave: boolean
readonly pageOrientation: PageOrientation
```

### `PageData`

```ts
interface PageData {
  image: string | null;       // URL or data: URL; null shows placeholder
  title: string;
  videoLink?: string | null;
  moves?: MoveName[] | null;  // length-11 array or omit for no Initialize Play button
  editable?: boolean;         // show per-page Add image / Add video affordances
}
```

### `PageMoves`

Accepted by `addPage` and `PageData.moves`. Either:
- An array of 11 `MoveName` values in `POSITIONS` order, or
- A partial `{ position: MoveName }` map (omitted positions default to
  `'none'`; map form avoids the length-11 footgun).

### Static hydration

```ts
Playbook.hydrate(
  root: HTMLElement,
  options: Omit<PlaybookOptions, 'parentId' | 'seedPages'> & { pages: PageData[] }
): Playbook
```

---

## `createConnectedLayout`

Scaffolds the standard "book-left / field+sandbox-right" layout.

```ts
createConnectedLayout(parentId?: string | null): ConnectedLayout
```

```ts
interface ConnectedLayout {
  fieldSlot: string;    // pass to new PlayDisplayer({ parentId: layout.fieldSlot })
  sandboxSlot: string;  // pass to field.spawnSandbox(true, layout.sandboxSlot)
  bookSlot: string;     // pass to new Playbook({ parentId: layout.bookSlot })
  destroy(): void;      // disconnects height-sync observer + removes scaffold
}
```

### `hydrateConnectedLayout`

```ts
hydrateConnectedLayout(root: HTMLElement, options?: { idSuffix?: string }): ConnectedLayout
```

Adopts a server-rendered layout scaffold and re-attaches the height-sync
`ResizeObserver`. Returns the same `ConnectedLayout` interface.

---

## SSR / hydration

Eliminates widget pop-in in SSR frameworks (Next.js, Remix, etc.) by
producing markup as a string for the server render, then adopting those nodes
on the client.

### String renderers (no DOM — safe in any server runtime)

```ts
import {
  renderPlayDisplayerHTML,
  renderSandboxHTML,
  renderPlaybookHTML,
  renderConnectedLayoutHTML,
} from '@connorburns/playbook';
```

```ts
renderPlayDisplayerHTML(options: PlayDisplayerSSROptions): string
// options: { size: FieldSize; name?: string }

renderSandboxHTML(options: SandboxSSROptions): string
// options: { size: FieldSize; idPrefix: string; allowSave?: boolean }

renderPlaybookHTML(options: PlaybookSSROptions): string
// options: { title: string; pageOrientation?: PageOrientation; pages: PageData[] }

renderConnectedLayoutHTML(options?: ConnectedLayoutSSROptions): ConnectedLayoutHTMLResult
// options: { idSuffix?: string }
// result: { html: string; fieldSlot: string; sandboxSlot: string; bookSlot: string }
```

`idPrefix` / `idSuffix` must be deterministic strings (not auto-counters) when
used for SSR so server and client ids agree.

### Next.js usage example

```tsx
// app/playbook/page.tsx  (Server Component)
import {
  renderConnectedLayoutHTML,
  renderPlayDisplayerHTML,
  renderPlaybookHTML,
  renderSandboxHTML,
} from '@connorburns/playbook';

const ID = 'demo'; // deterministic, unique per page

export default function PlaybookPage() {
  const layout = renderConnectedLayoutHTML({ idSuffix: ID });
  const fieldHTML = renderPlayDisplayerHTML({ size: 'large', name: 'Hail Mary' });
  const sandboxHTML = renderSandboxHTML({ size: 'large', idPrefix: ID, allowSave: true });
  const bookHTML = renderPlaybookHTML({
    title: 'My Playbook',
    pages: [
      { image: null, title: 'Hail Mary', moves: ['straight-deep','none','none','none','none','none','straight-deep','pass-qb','none','none','none'] },
    ],
  });

  // Inject widget HTML into the layout slots.
  const html = layout.html
    .replace(`id="${layout.fieldSlot}"></div>`,   `id="${layout.fieldSlot}">${fieldHTML}</div>`)
    .replace(`id="${layout.sandboxSlot}"></div>`, `id="${layout.sandboxSlot}">${sandboxHTML}</div>`)
    .replace(`id="${layout.bookSlot}"></div>`,    `id="${layout.bookSlot}">${bookHTML}</div>`);

  return <div ref={/* see client component below */} dangerouslySetInnerHTML={{ __html: html }} />;
}
```

```tsx
// app/playbook/PlaybookHydrator.tsx  ('use client')
'use client';
import { useEffect, useRef } from 'react';
import {
  PlayDisplayer,
  Playbook,
  hydrateConnectedLayout,
} from '@connorburns/playbook';

const ID = 'demo';
const PAGES = [
  { image: null, title: 'Hail Mary', moves: ['straight-deep','none','none','none','none','none','straight-deep','pass-qb','none','none','none'] },
];

export function PlaybookHydrator({ layoutRoot }: { layoutRoot: HTMLElement }) {
  useEffect(() => {
    const layout = hydrateConnectedLayout(layoutRoot, { idSuffix: ID });

    const field = PlayDisplayer.hydrate(
      document.getElementById(layout.fieldSlot)!.firstElementChild as HTMLElement,
      { size: 'large', name: 'Hail Mary' },
    );
    field.spawnSandbox(true, layout.sandboxSlot, null, ID);

    const book = Playbook.hydrate(
      document.getElementById(layout.bookSlot)!.firstElementChild as HTMLElement,
      { title: 'My Playbook', field, allowSave: true, pages: PAGES },
    );

    return () => { book.destroy(); field.destroy(); layout.destroy(); };
  }, [layoutRoot]);

  return null;
}
```

### Known limitation — scale jump at narrow viewports

`renderPlayDisplayerHTML` emits `--pb-field-scale:1` as the initial inline
scale. On narrow viewports where the real scale differs from 1, the first
client frame corrects it (a small reflow, not a flash). A CSS-only scaling
follow-up would eliminate this residual jump entirely.

---

## Positions

| Code | Full name |
|------|-----------|
| `lte` | Left Tight End |
| `lt` | Left Tackle |
| `lg` | Left Guard |
| `c` | Center |
| `rg` | Right Guard |
| `rt` | Right Tackle |
| `rte` | Right Tight End |
| `qb` | Quarterback |
| `lhb` | Left Halfback |
| `fb` | Fullback |
| `rhb` | Right Halfback |

`POSITIONS` order (used for length-11 move arrays):
`lte, lt, lg, c, rg, rt, rte, qb, lhb, fb, rhb`

---

## Valid moves

`'none'` is the sentinel for "no animation." All other names below map to
entries in the move catalog and are valid for any position (the rendering
makes semantic sense for the positions each move was designed for, but the
library does not enforce which positions can use which moves).

| Move name | Description |
|-----------|-------------|
| `none` | No animation |
| `straight-deep` | Run straight up-field deep |
| `deep-90-right` | Deep route, 90° cut right |
| `mid-90-right` | Mid-depth route, 90° cut right |
| `short-90-right` | Short route, 90° cut right |
| `deep-90-left` | Deep route, 90° cut left |
| `mid-90-left` | Mid-depth route, 90° cut left |
| `short-90-left` | Short route, 90° cut left |
| `hand-off-left-qb` | QB hands off to the left |
| `hand-off-right-qb` | QB hands off to the right |
| `pass-qb` | QB drops back to pass |
| `hole-one-lhb` – `hole-four-lhb` | LHB runs to holes 1–4 |
| `hole-five-rhb` – `hole-eight-rhb` | RHB runs to holes 5–8 |
| `hole-one-fb` – `hole-eight-fb` | FB runs to holes 1–8 |

Full list available at runtime:

```ts
import { KNOWN_MOVE_NAMES } from '@connorburns/playbook';
// ReadonlyArray of all non-'none' move names
```
