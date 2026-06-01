# Playbook.ts

A tiny TypeScript library for creating, saving, and animating American Football play
diagrams. Built on the Web Animations API with **no runtime dependencies** — ~5 KB gzipped.

**[▶ Live demo](https://connorburns.dev/projects/playbook)** · [Roadmap](PLAN.md)

---

## Why V2 exists

Playbook.ts is a ground-up modernization of [Playbook.js](https://github.com/connorburns19/Playbook.js),
a 2021 school project. The original was a single ~1,330-line jQuery IIFE: eleven copy-pasted
`setXxxMove` methods, two near-identical move catalogs differing only in pixel constants,
fixed-pixel widths that ignored screen size, and a lightslategrey-and-green palette that read as
exactly what it was — a rushed university assignment.

V2 keeps the original's two good ideas — a flippable play **book** and an animated 11-player
**field** — and rebuilds everything underneath them. The jQuery dependency is gone, replaced by the
native Web Animations API. The 1,330-line IIFE became a handful of strict-mode TypeScript modules.
The two duplicated move catalogs collapsed into one parameterized by field size. The palette became
a responsive `--pb-*` design-token system, and the API grew proper `destroy()`
teardown so it survives React's StrictMode remounting.

Built AI-assisted — Claude Code as the pair programmer, me as the architect: the design
decisions, the API shape, and knowing what "done" looked like.

## Quick start

```ts
import { PlayDisplayer, Playbook, createConnectedLayout } from '@connorburns/playbook';
import '@connorburns/playbook/styles.css';

// Mounts a responsive shell into the given element id, returns three slot IDs
const layout = createConnectedLayout('mount-point');

const field = new PlayDisplayer({ size: 'large', parentId: layout.fieldSlot });

const book = new Playbook({
  title: 'Example',
  field,                       // wires each page's "Initialize Play" to this field
  allowSave: true,             // show the Save to Book button
  pageOrientation: 'vertical',
  parentId: layout.bookSlot,
});

// Eleven dropdowns end users can compose plays with, plus a Save to Book button
field.spawnSandbox(true, layout.sandboxSlot, book.createSaveButton());
```

Or drive a field directly:

```ts
const field = new PlayDisplayer({ size: 'large', parentId: 'field-slot' });

field.setMove('lte', 'straight-deep');
field.setMove('qb', 'pass-qb');
field.setMove('fb', 'hole-four-fb');

await field.play(); // resolves when every per-player animation finishes
```

## Status

Phases 1–4 are complete: the typed rewrite, the visual modernization, the UX overhaul, and a
library-hardening pass. **Phase 5 — an in-browser code playground — is next.** The full phased
roadmap, exit criteria, and working notes live in [PLAN.md](PLAN.md).

## Tech stack

- **TypeScript**, strict mode (zero `any`)
- **Web Animations API** — no jQuery, no runtime dependencies
- **tsup** build → ESM + CJS + `.d.ts`
- **Vitest** — focused coverage on the move catalog and core classes
- MIT licensed

## Install

Beta — not yet published to npm. A real `npm install @connorburns/playbook` lands when Phase 9
ships; until then the [live demo](https://connorburns.dev/projects/playbook) consumes the library
as a locally-packed tarball. Track the publish milestone in [PLAN.md](PLAN.md).

## License

MIT © Connor Burns
