/**
 * Public type definitions for the Playbook library.
 */

/** Football offensive positions. Order matches `POSITIONS`. */
export type Position =
  | 'lte' | 'lt' | 'lg' | 'c' | 'rg' | 'rt' | 'rte'
  | 'qb' | 'lhb' | 'fb' | 'rhb';

/** All positions in formation order (front line, then middle, then back). */
export const POSITIONS: readonly Position[] = [
  'lte', 'lt', 'lg', 'c', 'rg', 'rt', 'rte',
  'qb',
  'lhb', 'fb', 'rhb',
] as const;

/** Human-readable label for each position (used in UI rendering). */
export const POSITION_LABELS: Record<Position, string> = {
  lte: 'LTE', lt: 'LT', lg: 'LG', c: 'C', rg: 'RG', rt: 'RT', rte: 'RTE',
  qb: 'QB',
  lhb: 'LHB', fb: 'FB', rhb: 'RHB',
};

/** Full position names — used as `aria-label`s so screen readers say "Left Tight End" instead of "LTE". */
export const POSITION_FULL_NAMES: Record<Position, string> = {
  lte: 'Left Tight End',
  lt: 'Left Tackle',
  lg: 'Left Guard',
  c: 'Center',
  rg: 'Right Guard',
  rt: 'Right Tackle',
  rte: 'Right Tight End',
  qb: 'Quarterback',
  lhb: 'Left Halfback',
  fb: 'Fullback',
  rhb: 'Right Halfback',
};

/** Available `PlayDisplayer` sizes. Each has its own dimensions and move offsets. */
export type FieldSize = 'large' | 'xx-large';

/**
 * The set of named moves. `'none'` is a sentinel for "no animation."
 * All other names map to entries in the move catalog (see `getMove`).
 */
export type MoveName =
  | 'none'
  | 'straight-deep'
  | 'deep-90-right' | 'mid-90-right' | 'short-90-right'
  | 'deep-90-left' | 'mid-90-left' | 'short-90-left'
  | 'hole-one-lhb' | 'hole-two-lhb' | 'hole-three-lhb' | 'hole-four-lhb'
  | 'hole-five-rhb' | 'hole-six-rhb' | 'hole-seven-rhb' | 'hole-eight-rhb'
  | 'hand-off-left-qb' | 'hand-off-right-qb' | 'pass-qb'
  | 'hole-one-fb' | 'hole-two-fb' | 'hole-three-fb' | 'hole-four-fb'
  | 'hole-five-fb' | 'hole-six-fb' | 'hole-seven-fb' | 'hole-eight-fb';

/** A single CSS positional offset for one leg of an animation. */
export type CSSOffset = Partial<Record<'top' | 'bottom' | 'left' | 'right', number>>;

/** One leg of a move — interpolate the given offsets over `duration` ms. */
export interface MoveStep {
  offsets: CSSOffset;
  duration: number;
}

/** A named move = an ordered list of animation legs. */
export interface Move {
  name: Exclude<MoveName, 'none'>;
  steps: MoveStep[];
}

/**
 * Move assignments accepted by `Playbook.addPage`. Either:
 *   - an array of entries in `POSITIONS` order (length 11; short arrays pad
 *     with `'none'`, extras are ignored — with a dev warning), or
 *   - a partial map keyed by position; any omitted position defaults to
 *     `'none'`. The map form sidesteps the array-length footgun entirely.
 */
export type PageMoves = MoveName[] | Partial<Record<Position, MoveName>>;

/** Plain serializable shape of a playbook page. */
export interface PageData {
  /** Image URL (`data:` or `https:`), or `null` for the placeholder. */
  image: string | null;
  title: string;
  videoLink?: string | null;
  /** Eleven entries in `POSITIONS` order. Missing/extra entries treated as `'none'`. */
  moves?: MoveName[] | null;
  /**
   * Whether the page renders per-page edit affordances (Add/Replace image, video).
   * Defaults to `false` (read-only) for developer-added pages; `true` for user-saved plays.
   */
  editable?: boolean;
}

// ---------------------------------------------------------------------------
// SSR option types — used by the string renderers in `render.ts`
// ---------------------------------------------------------------------------

/** Options for `renderPlayDisplayerHTML` — a subset of `PlayDisplayerOptions` without DOM specifics. */
export interface PlayDisplayerSSROptions {
  size: FieldSize;
  name?: string;
}

/** Options for `renderSandboxHTML`. `idPrefix` must be unique per page render to avoid id collisions. */
export interface SandboxSSROptions {
  size: FieldSize;
  /** Stable, unique prefix for label/select id pairs. Pass the same value to `spawnSandbox` at hydration. */
  idPrefix: string;
  /** When true, renders the name-input row (same as `allowSave` on `spawnSandbox`). Default: false. */
  allowSave?: boolean;
}

/** Options for `renderPlaybookHTML`. Pages must be declared up-front (no `addPage` at SSR time). */
export interface PlaybookSSROptions {
  title: string;
  pageOrientation?: 'horizontal' | 'vertical';
  /** All pages to render. The renderer uses `image`, `title`, `videoLink`, `moves`, `editable`. */
  pages: PageData[];
}

/** Options for `renderConnectedLayoutHTML` / `hydrateConnectedLayout`. */
export interface ConnectedLayoutSSROptions {
  /**
   * Explicit suffix for slot IDs. Must be the same value used at hydration time.
   * When omitted the auto-counter is used (fine for client-only usage).
   */
  idSuffix?: string;
}

/** Return type of `renderConnectedLayoutHTML`. */
export interface ConnectedLayoutHTMLResult {
  html: string;
  fieldSlot: string;
  sandboxSlot: string;
  bookSlot: string;
}
