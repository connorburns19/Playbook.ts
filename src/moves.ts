/**
 * Move catalog. Replaces the two duplicate `getValidMoveList*` functions in V1
 * with a single parameterized builder driven by per-size dimension profiles.
 *
 * Numbers preserved from V1 (including the original asymmetries — e.g. xx-large
 * hole-three-lhb uses right: 25 while hole-four-lhb uses left: 30). Visual cleanup
 * happens in Phase 2.
 */

import type { FieldSize, Move, MoveName } from './types.js';

/** Pixel dimensions per field size. */
interface SizeProfile {
  /** Vertical distance for "deep" routes. */
  deepY: number;
  /** Vertical distance for "mid" routes. */
  midY: number;
  /** Vertical distance for "short" routes (also QB pass dropback is separate). */
  shortY: number;
  /** Vertical distance for backfield hole moves (LHB/RHB/FB). */
  holeY: number;
  /** Horizontal cut distance for 90° routes. */
  cutX: number;
  /** QB handoff horizontal offset. */
  handoffX: number;
  /** QB pass dropback (negative direction — uses `top`). */
  passY: number;
  /**
   * Halfback hole X-offsets in order: [hole-1-lhb ... hole-4-lhb, hole-5-rhb ... hole-8-rhb].
   * Each entry is `[side, distance]` where side is 'left' or 'right'.
   */
  hbHoles: ReadonlyArray<readonly ['left' | 'right', number]>;
  /** Fullback hole X-offsets in order [hole-1-fb ... hole-8-fb]. */
  fbHoles: ReadonlyArray<readonly ['left' | 'right', number]>;
}

const PROFILES: Record<FieldSize, SizeProfile> = {
  'xx-large': {
    deepY: 500, midY: 300, shortY: 200, holeY: 200,
    cutX: 400, handoffX: 50, passY: 100,
    hbHoles: [
      ['right', 250], ['right', 150], ['right', 25], ['left', 30],
      ['right', 30], ['left', 30], ['left', 150], ['left', 250],
    ],
    fbHoles: [
      ['right', 375], ['right', 250], ['right', 150], ['right', 50],
      ['left', 50], ['left', 150], ['left', 250], ['left', 375],
    ],
  },
  'large': {
    deepY: 350, midY: 210, shortY: 140, holeY: 140,
    cutX: 260, handoffX: 35, passY: 60,
    hbHoles: [
      ['right', 175], ['right', 105], ['right', 18], ['left', 21],
      ['right', 21], ['left', 21], ['left', 105], ['left', 175],
    ],
    fbHoles: [
      ['right', 263], ['right', 175], ['right', 105], ['right', 35],
      ['left', 35], ['left', 105], ['left', 175], ['left', 263],
    ],
  },
};

const HB_NAMES = [
  'hole-one-lhb', 'hole-two-lhb', 'hole-three-lhb', 'hole-four-lhb',
  'hole-five-rhb', 'hole-six-rhb', 'hole-seven-rhb', 'hole-eight-rhb',
] as const satisfies ReadonlyArray<Exclude<MoveName, 'none'>>;

const FB_NAMES = [
  'hole-one-fb', 'hole-two-fb', 'hole-three-fb', 'hole-four-fb',
  'hole-five-fb', 'hole-six-fb', 'hole-seven-fb', 'hole-eight-fb',
] as const satisfies ReadonlyArray<Exclude<MoveName, 'none'>>;

function buildCatalog(p: SizeProfile): Move[] {
  const moves: Move[] = [
    { name: 'straight-deep', steps: [{ offsets: { bottom: p.deepY }, duration: 1000 }] },
    {
      name: 'deep-90-right',
      steps: [
        { offsets: { bottom: p.deepY }, duration: 1000 },
        { offsets: { left: p.cutX }, duration: 1000 },
      ],
    },
    {
      name: 'mid-90-right',
      steps: [
        { offsets: { bottom: p.midY }, duration: 1000 },
        { offsets: { left: p.cutX }, duration: 1000 },
      ],
    },
    {
      name: 'short-90-right',
      steps: [
        { offsets: { bottom: p.shortY }, duration: 700 },
        { offsets: { left: p.cutX }, duration: 1000 },
      ],
    },
    {
      name: 'deep-90-left',
      steps: [
        { offsets: { bottom: p.deepY }, duration: 1000 },
        { offsets: { right: p.cutX }, duration: 1000 },
      ],
    },
    {
      name: 'mid-90-left',
      steps: [
        { offsets: { bottom: p.midY }, duration: 1000 },
        { offsets: { right: p.cutX }, duration: 1000 },
      ],
    },
    {
      // Preserved V1 behavior: the "left" variant also uses `right` for the cut.
      // Looks like an original-code bug but we keep it for V1 parity in Phase 1.
      name: 'short-90-left',
      steps: [
        { offsets: { bottom: p.shortY }, duration: 700 },
        { offsets: { right: p.cutX }, duration: 1000 },
      ],
    },
    { name: 'hand-off-left-qb', steps: [{ offsets: { right: p.handoffX }, duration: 200 }] },
    { name: 'hand-off-right-qb', steps: [{ offsets: { left: p.handoffX }, duration: 200 }] },
    { name: 'pass-qb', steps: [{ offsets: { top: p.passY }, duration: 1100 }] },
  ];

  for (let i = 0; i < 8; i++) {
    const [side, dist] = p.hbHoles[i]!;
    moves.push({
      name: HB_NAMES[i]!,
      steps: [{ offsets: { [side]: dist, bottom: p.holeY }, duration: 900 }],
    });
  }

  for (let i = 0; i < 8; i++) {
    const [side, dist] = p.fbHoles[i]!;
    moves.push({
      name: FB_NAMES[i]!,
      steps: [{ offsets: { [side]: dist, bottom: p.holeY }, duration: 900 }],
    });
  }

  return moves;
}

const CATALOGS: Record<FieldSize, ReadonlyArray<Move>> = {
  'xx-large': buildCatalog(PROFILES['xx-large']),
  'large': buildCatalog(PROFILES['large']),
};

/** Return all moves available for a given field size. */
export function getMoveCatalog(size: FieldSize): ReadonlyArray<Move> {
  return CATALOGS[size];
}

/** Look up a single move by name for a given field size. Returns undefined for unknown names or `'none'`. */
export function getMove(name: string, size: FieldSize): Move | undefined {
  return CATALOGS[size].find((m) => m.name === name);
}

/** All non-`'none'` move names, sourced from the xx-large catalog. */
export const KNOWN_MOVE_NAMES: ReadonlyArray<Exclude<MoveName, 'none'>> =
  CATALOGS['xx-large'].map((m) => m.name);
