import { describe, expect, it } from 'vitest';
import { KNOWN_MOVE_NAMES, getMove, getMoveCatalog } from '../src/moves.js';
import type { FieldSize } from '../src/types.js';

describe('moves catalog', () => {
  const sizes: FieldSize[] = ['large', 'xx-large'];

  it('exposes the same set of move names for every field size', () => {
    const largeNames = getMoveCatalog('large').map((m) => m.name).sort();
    const xxNames = getMoveCatalog('xx-large').map((m) => m.name).sort();
    expect(largeNames).toEqual(xxNames);
  });

  it('catalog has 26 moves (matches V1)', () => {
    for (const size of sizes) {
      expect(getMoveCatalog(size).length).toBe(26);
    }
  });

  it.each(sizes)('every move in %s catalog has at least one step', (size) => {
    for (const move of getMoveCatalog(size)) {
      expect(move.steps.length).toBeGreaterThan(0);
      for (const step of move.steps) {
        expect(step.duration).toBeGreaterThan(0);
        expect(Object.keys(step.offsets).length).toBeGreaterThan(0);
      }
    }
  });

  it('looks up a known move by name within a size', () => {
    const move = getMove('straight-deep', 'large');
    expect(move).toBeDefined();
    expect(move?.name).toBe('straight-deep');
    expect(move?.steps[0]?.offsets.bottom).toBeDefined();
  });

  it('returns undefined for unknown move names', () => {
    expect(getMove('not-a-real-move', 'large')).toBeUndefined();
    // 'none' is a sentinel — not in the catalog
    expect(getMove('none', 'large')).toBeUndefined();
  });

  it('large field uses smaller pixel offsets than xx-large', () => {
    const largeDeep = getMove('straight-deep', 'large');
    const xxDeep = getMove('straight-deep', 'xx-large');
    expect(largeDeep?.steps[0]?.offsets.bottom).toBeLessThan(
      xxDeep!.steps[0]!.offsets.bottom!,
    );
  });

  it('multi-step moves like deep-90-right interpolate Y then X', () => {
    const move = getMove('deep-90-right', 'large');
    expect(move?.steps).toHaveLength(2);
    expect(move?.steps[0]?.offsets.bottom).toBeDefined();
    expect(move?.steps[1]?.offsets.left).toBeDefined();
  });

  it('KNOWN_MOVE_NAMES contains expected entries', () => {
    expect(KNOWN_MOVE_NAMES).toContain('straight-deep');
    expect(KNOWN_MOVE_NAMES).toContain('pass-qb');
    expect(KNOWN_MOVE_NAMES).toContain('hole-four-fb');
    expect(KNOWN_MOVE_NAMES).not.toContain('none' as never);
  });
});
