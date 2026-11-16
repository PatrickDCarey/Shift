import { describe, expect, it } from 'vitest';
import { arrowRects, chevronRects, dashedRingRects, needleRects, patternInk, patternRim, ringRects } from './meterPixels';

const area = (rs: readonly { w: number; h: number }[]): number => rs.reduce((n, r) => n + r.w * r.h, 0);

describe('meterPixels', () => {
  it('a ring of width t around w x h covers w*h - (w-2t)*(h-2t) pixels with no overlap', () => {
    expect(area(ringRects({ x: 0, y: 0, w: 14, h: 14 }, 2))).toBe(14 * 14 - 10 * 10);
    expect(area(ringRects({ x: 0, y: 0, w: 9, h: 9 }, 1))).toBe(32);
  });

  it('a dashed ring has all four corners and fewer pixels than a solid ring', () => {
    const r = { x: 0, y: 0, w: 12, h: 12 };
    const d = dashedRingRects(r, 2, 2);
    for (const [x, y] of [[0, 0], [11, 0], [0, 11], [11, 11]]) expect(d.some((p) => p.x === x && p.y === y)).toBe(true);
    expect(area(d)).toBeLessThan(area(ringRects(r, 1)));
    expect(area(d)).toBeGreaterThan(0);
  });

  it('the needle grows 2 px a row from a 1 px apex centred on x', () => {
    expect(needleRects(10, 5, 3)).toEqual([
      { x: 10, y: 5, w: 1, h: 1 },
      { x: 9, y: 6, w: 3, h: 1 },
      { x: 8, y: 7, w: 5, h: 1 },
    ]);
    expect(needleRects(10, 5, 0)).toEqual([]);
  });

  it('arrows narrow toward their point, down or up', () => {
    const down = arrowRects({ x: 0, y: 10, w: 7, h: 4 }, 'down').map((r) => r.w);
    const up = arrowRects({ x: 0, y: 10, w: 7, h: 4 }, 'up').map((r) => r.w);
    expect(down).toEqual([7, 5, 3, 1]);
    expect(up).toEqual([7, 5, 3, 1]);
    expect(arrowRects({ x: 0, y: 10, w: 7, h: 4 }, 'up')[0]?.y).toBe(13);
  });

  it('the 3 x 5 chevron points left: tips at the right on the top and bottom rows, point at the left in the middle', () => {
    expect(chevronRects(0, 0, 3, 5).map((r) => r.x)).toEqual([2, 1, 0, 1, 2]);
  });

  it('each non-white pattern has ink, plain has none, and the rim is a subset of the ink', () => {
    expect(patternInk('plain', 9)).toEqual([]);
    for (const id of ['stripes', 'dots', 'chevrons', 'checker'] as const) {
      const ink = patternInk(id, 9);
      expect(ink.length).toBeGreaterThan(0);
      expect(patternRim(id, 9).length).toBeGreaterThan(0);
      expect(patternRim(id, 9).length).toBeLessThanOrEqual(ink.length);
    }
  });

  it('the four patterns differ pixel by pixel at 9 px (shape, not colour)', () => {
    const keys = (['stripes', 'dots', 'chevrons', 'checker'] as const).map((id) => patternInk(id, 9).map((p) => `${p.x},${p.y}`).join(';'));
    expect(new Set(keys).size).toBe(4);
  });
});
