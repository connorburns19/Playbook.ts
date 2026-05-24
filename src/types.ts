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

/** Plain serializable shape of a playbook page. */
export interface PageData {
  image: string;
  title: string;
  videoLink?: string | null;
  /** Eleven entries in `POSITIONS` order. Missing/extra entries treated as `'none'`. */
  moves?: MoveName[] | null;
}
