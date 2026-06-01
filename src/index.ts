/**
 * Public entry point for `@connorburns/playbook`.
 *
 * V2 of the FbPlaybook.js school project — typed, modular, jQuery-free.
 * See PLAN.md and CLAUDE.md in the repo root for the modernization roadmap.
 */

export { Playbook } from './playbook.js';
export type { PlaybookOptions, PageOrientation } from './playbook.js';

export { PlayDisplayer } from './displayer.js';
export type { PlayDisplayerOptions, PlaybackState } from './displayer.js';

export {
  POSITIONS,
  POSITION_LABELS,
  POSITION_FULL_NAMES,
} from './types.js';
export type {
  Position,
  MoveName,
  FieldSize,
  Move,
  MoveStep,
  CSSOffset,
  PageData,
  PageMoves,
} from './types.js';

export { getMove, getMoveCatalog, KNOWN_MOVE_NAMES } from './moves.js';

export { animateInSequence, resetAnimation } from './animation.js';

export { createConnectedLayout, hydrateConnectedLayout } from './layout.js';
export type { ConnectedLayout } from './layout.js';

export {
  renderPlayDisplayerHTML,
  renderSandboxHTML,
  renderPlaybookHTML,
  renderConnectedLayoutHTML,
} from './render.js';

export type {
  PlayDisplayerSSROptions,
  SandboxSSROptions,
  PlaybookSSROptions,
  ConnectedLayoutSSROptions,
  ConnectedLayoutHTMLResult,
} from './types.js';
