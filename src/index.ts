/**
 * Public entry point for `@connorburns/playbook`.
 *
 * V2 of the FbPlaybook.js school project — typed, modular, jQuery-free.
 * See PLAN.md and CLAUDE.md in the repo root for the modernization roadmap.
 */

export { Playbook } from './playbook.js';
export type { PlaybookOptions } from './playbook.js';

export { PlayDisplayer } from './displayer.js';
export type { PlayDisplayerOptions } from './displayer.js';

export {
  POSITIONS,
  POSITION_LABELS,
} from './types.js';
export type {
  Position,
  MoveName,
  FieldSize,
  Move,
  MoveStep,
  CSSOffset,
  PageData,
} from './types.js';

export { getMove, getMoveCatalog, KNOWN_MOVE_NAMES } from './moves.js';

export { animateInSequence, resetAnimation } from './animation.js';
