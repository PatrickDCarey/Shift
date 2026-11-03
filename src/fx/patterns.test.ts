import { describe, expect, it } from 'vitest';
import {
  PATTERN_IDS,
  PIXEL_CELLS,
  clipLineToSquare,
  dashedRectSegments,
  isPatternId,
  patternGeometry,
  pixelPatternMask,
  pixelPatternOn,
  type PatternId,
  type PatternShape,
} from './patterns';

const MIN_STROKE = 1.5;
const SIZES = [32, 16] as const;

/** Is the point within a butt-capped stroke of width `w` along the segment (how Phaser draws lineBetween)? */
function onStroke(px: number, py: number, x1: number, y1: number, x2: number, y2: number, w: number): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return false;
  const t = ((px - x1) * dx + (py - y1) * dy) / len2;
  if (t < 0 || t > 1) return false;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)) <= w / 2 + 1e-9;
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
            ? onStroke(px, py, s.x1, s.y1, s.x2, s.y2, geo.strokeWidth)
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
    expect(patternGeometry('checker', 32, MIN_STROKE)).toEqual(patternGeometry('checker', 32, MIN_STROKE));
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

describe('pixel patterns (16 px tile art)', () => {
  const cells = Object.entries(PIXEL_CELLS) as Array<[string, { width: number; height: number }]>;
  const marked = PATTERN_IDS.filter((id) => id !== 'plain');
  const PHASES = [0, 1, 2, 3, 4, 5, 6, 7];

  it('plain never inks and is the only such pattern', () => {
    expect(pixelPatternOn('plain', 3, 4, 12)).toBe(false);
    for (const id of marked) expect(pixelPatternMask(id, 12, 10).some(Boolean), id).toBe(true);
  });

  it.each(cells)('covers 20 to 55 percent of the %s cell at every phase', (_name, c) => {
    for (const id of marked) {
      for (const sx of PHASES) {
        for (const sy of PHASES) {
          const cov = coverage([...pixelPatternMask(id, c.width, c.height, sx, sy)]);
          expect(cov, `${id} ${c.width}x${c.height} phase ${sx},${sy}`).toBeGreaterThanOrEqual(0.2);
          expect(cov, `${id} ${c.width}x${c.height} phase ${sx},${sy}`).toBeLessThanOrEqual(0.55);
        }
      }
    }
  });

  it.each(cells)('marked patterns differ from each other on at least 30 percent of the %s cell at any relative phase', (_name, c) => {
    for (let a = 0; a < marked.length; a++) {
      for (let b = a + 1; b < marked.length; b++) {
        const A = marked[a] as PatternId;
        const B = marked[b] as PatternId;
        let worst = 1;
        for (const sx of PHASES) {
          for (const sy of PHASES) {
            worst = Math.min(worst, difference([...pixelPatternMask(A, c.width, c.height)], [...pixelPatternMask(B, c.width, c.height, sx, sy)]));
          }
        }
        expect(worst, `${A} vs ${B} ${c.width}x${c.height}`).toBeGreaterThanOrEqual(0.3);
      }
    }
  });

  it.each(cells)('plain differs from every marked pattern on at least 20 percent of the %s cell', (_name, c) => {
    for (const id of marked) {
      for (const sx of PHASES) {
        for (const sy of PHASES) {
          expect(difference([...pixelPatternMask('plain', c.width, c.height)], [...pixelPatternMask(id, c.width, c.height, sx, sy)]), id).toBeGreaterThanOrEqual(0.2);
        }
      }
    }
  });

  it('every mark is at least 2 px wide (survives 2x scaling and a shrunken iframe)', () => {
    for (const id of marked) {
      for (const sy of PHASES) {
        const m = pixelPatternMask(id, 12, 10, 0, sy);
        for (let y = 0; y < 10; y++) {
          let run = 0;
          for (let x = 0; x <= 12; x++) {
            const on = x < 12 && m[y * 12 + x] === true;
            if (on) run++;
            else {
              if (run > 0) expect(run, `${id} row ${y} phase ${sy}`).toBeGreaterThanOrEqual(2);
              run = 0;
            }
          }
        }
      }
    }
  });

  it('still tells the patterns apart after 2x2 averaging (a half-scale view)', () => {
    const pool = (m: readonly boolean[], w: number, h: number): number[] => {
      const out: number[] = [];
      for (let y = 0; y + 1 < h; y += 2) {
        for (let x = 0; x + 1 < w; x += 2) {
          out.push(((m[y * w + x] ? 1 : 0) + (m[y * w + x + 1] ? 1 : 0) + (m[(y + 1) * w + x] ? 1 : 0) + (m[(y + 1) * w + x + 1] ? 1 : 0)) / 4);
        }
      }
      return out;
    };
    const { width: w, height: h } = PIXEL_CELLS.tile;
    for (let a = 0; a < PATTERN_IDS.length; a++) {
      for (let b = a + 1; b < PATTERN_IDS.length; b++) {
        const A = pool(pixelPatternMask(PATTERN_IDS[a] as PatternId, w, h), w, h);
        const B = pool(pixelPatternMask(PATTERN_IDS[b] as PatternId, w, h), w, h);
        const d = A.reduce((n, v, i) => n + Math.abs(v - (B[i] ?? 0)), 0) / A.length;
        expect(d, `${PATTERN_IDS[a]} vs ${PATTERN_IDS[b]}`).toBeGreaterThanOrEqual(0.15);
      }
    }
  });

  it('chevrons are centred on the cell and do not move with a sideways phase', () => {
    expect(pixelPatternMask('chevrons', 12, 10, 0, 0)).toEqual(pixelPatternMask('chevrons', 12, 10, 3, 0));
  });
});

describe('checker (vector, replaces the crosshatch)', () => {
  it('is half ink at 32 px and 16 px and made of square cells', () => {
    for (const size of SIZES) {
      const g = patternGeometry('checker', size, MIN_STROKE);
      const cell = size >= 24 ? size / 4 : size / 2;
      expect(g.strokeWidth).toBeCloseTo(cell, 9);
      expect(g.shapes).toHaveLength(size >= 24 ? 8 : 2);
      expect(coverage(mask('checker', size))).toBeCloseTo(0.5, 1);
    }
  });
});
