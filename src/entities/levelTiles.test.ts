import { describe, expect, it } from 'vitest';
import { tilesetIndex } from '../fx';
import { planLevel } from './levelTiles';
import { gridLevel } from './testkit';

describe('planLevel', () => {
  const level = gridLevel(['.....', '.@.BE', '#####', '#####']);
  const plan = planLevel(level);

  it('leaves empty, coloured and exit cells empty in the static layer', () => {
    expect(plan.staticIndices.slice(0, 10).every((i) => i === -1)).toBe(true);
    expect(plan.staticIndices[1 * 5 + 3]).toBe(-1);
  });

  it('numbers safe tiles by neighbour mask and depth', () => {
    // top row of safe, middle: neighbours left, right, down: mask 2|4|8 = 14, nothing above: depth 0
    expect(plan.staticIndices[2 * 5 + 2]).toBe(tilesetIndex.safe(14, 0));
    // row below: up neighbour is safe, depth 1
    expect(plan.staticIndices[3 * 5 + 2]).toBe(tilesetIndex.safe(1 | 2 | 8, 1));
  });

  it('plans coloured cells with a solid and a ghost index', () => {
    expect(plan.colored).toEqual([{ col: 3, row: 1, band: 1, solid: tilesetIndex.solid('blue', 0), ghost: tilesetIndex.ghost('blue') }]);
  });

  it('joins neighbouring cells of the same band only', () => {
    const p = planLevel(gridLevel(['......', '.@BBGE', '######']));
    const [b0, b1, g] = p.colored;
    expect(b0?.solid).toBe(tilesetIndex.solid('blue', 2));
    expect(b1?.solid).toBe(tilesetIndex.solid('blue', 8));
    expect(g?.solid).toBe(tilesetIndex.solid('green', 0));
  });

  it('lists exits', () => {
    expect(plan.exits).toEqual([{ col: 4, row: 1 }]);
  });
});
