import { describe, expect, it } from 'vitest';
import {
  PATTERN_IDS,
  clipLineToSquare,
  dashedRectSegments,
  isPatternId,
  patternGeometry,
  type PatternId,
  type PatternShape,
} from './patterns';

const MIN_STROKE = 1.5;
const SIZES = [32, 16] as const;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Rasterise a pattern to an ink mask at `size` x `size` pixels (pixel centres). */
function mask(id: PatternId, size: number): boolean[] {
  const geo = patternGeometry(id, size, MIN_STROKE);
  const out: boolean[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      out.push(
        geo.shapes.some((s: PatternShape) =>
          s.kind === 'line'
            ? distToSegment(px, py, s.x1, s.y1, s.x2, s.y2) <= geo.strokeWidth / 2
            : Math.hypot(px - s.cx, py - s.cy) <= s.r,
        ),
      );
    }
  }
  return out;
}

const coverage = (m: boolean[]): number => m.filter(Boolean).length / m.length;
const difference = (a: boolean[], b: boolean[]): number => a.filter((v, i) => v !== b[i]).length / a.length;

describe('patternGeometry', () => {
  it.each(SIZES)('keeps every shape inside the %i px square', (size) => {
    for (const id of PATTERN_IDS) {
      const { shapes } = patternGeometry(id, size, MIN_STROKE);
      for (const s of shapes) {
        const pts =
          s.kind === 'line'
            ? [
                [s.x1, s.y1],
                [s.x2, s.y2],
              ]
            : [
                [s.cx - s.r, s.cy - s.r],
                [s.cx + s.r, s.cy + s.r],
              ];
        for (const [x = NaN, y = NaN] of pts) {
          expect(x, `${id} x`).toBeGreaterThanOrEqual(-1e-9);
          expect(x, `${id} x`).toBeLessThanOrEqual(size + 1e-9);
          expect(y, `${id} y`).toBeGreaterThanOrEqual(-1e-9);
          expect(y, `${id} y`).toBeLessThanOrEqual(size + 1e-9);
        }
      }
    }
  });

  it('plain has no marks and every other pattern has some', () => {
    expect(patternGeometry('plain', 32, MIN_STROKE).shapes).toHaveLength(0);
    for (const id of PATTERN_IDS.filter((p) => p !== 'plain')) {
      expect(patternGeometry(id, 32, MIN_STROKE).shapes.length, id).toBeGreaterThan(0);
    }
  });

  it('never draws a line thinner than the minimum stroke times 0.75', () => {
    for (const id of PATTERN_IDS) {
      for (const size of SIZES) {
        expect(patternGeometry(id, size, MIN_STROKE).strokeWidth).toBeGreaterThanOrEqual(MIN_STROKE * 0.75);
      }
    }
  });

  it('is deterministic', () => {
    expect(patternGeometry('crosshatch', 32, MIN_STROKE)).toEqual(patternGeometry('crosshatch', 32, MIN_STROKE));
  });

  it.each(SIZES)('patterns cover a legible share of a %i px tile (10 to 55 percent ink)', (size) => {
    for (const id of PATTERN_IDS.filter((p) => p !== 'plain')) {
      const c = coverage(mask(id, size));
      expect(c, `${id} @${size}`).toBeGreaterThanOrEqual(0.1);
      expect(c, `${id} @${size}`).toBeLessThanOrEqual(0.55);
    }
  });

  it.each(SIZES)('every pair of patterns differs on at least 15 percent of pixels at %i px', (size) => {
    const masks = PATTERN_IDS.map((id) => [id, mask(id, size)] as const);
    for (let i = 0; i < masks.length; i++) {
      for (let j = i + 1; j < masks.length; j++) {
        const a = masks[i];
        const b = masks[j];
        if (!a || !b) continue;
        expect(difference(a[1], b[1]), `${a[0]} vs ${b[0]} @${size}`).toBeGreaterThanOrEqual(0.15);
      }
    }
  });
});

describe('clipLineToSquare', () => {
  it('clips a diagonal that overshoots the square', () => {
    const c = clipLineToSquare({ kind: 'line', x1: -10, y1: 0, x2: 30, y2: 40 }, 32);
    expect(c).not.toBeNull();
    expect(c?.x1).toBeCloseTo(0, 9);
    expect(c?.y1).toBeCloseTo(10, 9);
    expect(c?.x2).toBeCloseTo(22, 9);
    expect(c?.y2).toBeCloseTo(32, 9);
  });

  it('returns null for a line fully outside and handles axis-parallel lines', () => {
    expect(clipLineToSquare({ kind: 'line', x1: 40, y1: 0, x2: 50, y2: 10 }, 32)).toBeNull();
    expect(clipLineToSquare({ kind: 'line', x1: 40, y1: 5, x2: 40, y2: 20 }, 32)).toBeNull();
    expect(clipLineToSquare({ kind: 'line', x1: -5, y1: 8, x2: 40, y2: 8 }, 32)).toEqual({
      kind: 'line',
      x1: 0,
      y1: 8,
      x2: 32,
      y2: 8,
    });
  });

  it('returns null when the segment misses the square diagonally', () => {
    expect(clipLineToSquare({ kind: 'line', x1: 33, y1: -5, x2: 60, y2: 20 }, 32)).toBeNull();
  });
});

describe('dashedRectSegments', () => {
  it('covers dash/(dash+gap) of the perimeter and starts each side with a dash', () => {
    const segs = dashedRectSegments(0, 0, 32, 32, 5, 4);
    const total = segs.reduce((n, s) => n + Math.hypot(s.x2 - s.x1, s.y2 - s.y1), 0);
    expect(total).toBeGreaterThan(128 * 0.5);
    expect(total).toBeLessThan(128 * 0.65);
    expect(segs[0]).toMatchObject({ x1: 0, y1: 0, x2: 5, y2: 0 });
  });

  it('keeps every segment on the rectangle outline', () => {
    for (const s of dashedRectSegments(2, 3, 20, 10, 4, 3)) {
      for (const [x, y] of [
        [s.x1, s.y1],
        [s.x2, s.y2],
      ] as const) {
        const onEdge = x === 2 || x === 22 || y === 3 || y === 13 || Math.abs(x - 22) < 1e-9 || Math.abs(y - 13) < 1e-9;
        expect(onEdge).toBe(true);
      }
    }
  });
});

describe('isPatternId', () => {
  it('accepts known ids only', () => {
    expect(isPatternId('chevrons')).toBe(true);
    expect(isPatternId('zigzag')).toBe(false);
  });
});
