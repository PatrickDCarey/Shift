import { describe, expect, it } from 'vitest';
import type { Mover } from '../core/types';
import { sealedPockets } from './sealedPockets';
import { gridLevel } from './testkit';

const rows = ['.@...E', '######', '#....#', '#....#', '######', '......'];
const lift: Mover = {
  origin: { col: 1, row: 3 },
  width: 2,
  height: 1,
  solid: { kind: 'safe' },
  path: [{ kind: 'move', dir: 'u', tiles: 1 }, { kind: 'move', dir: 'd', tiles: 1 }],
  speed: 2,
  phase: 0,
};

describe('sealedPockets with slabs', () => {
  it('is no pocket when a slab sweeps a cell of it (a rider can leave)', () => {
    expect(sealedPockets({ ...gridLevel(rows), movers: [lift] })).toHaveLength(0);
  });

  it('still seals a pocket the slabs never touch', () => {
    const far: Mover = { ...lift, origin: { col: 1, row: 5 } };
    expect(sealedPockets({ ...gridLevel(rows), movers: [far] })).toHaveLength(1);
  });
});
