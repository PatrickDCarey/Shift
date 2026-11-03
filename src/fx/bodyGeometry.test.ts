import { describe, expect, it } from 'vitest';
import { bodyCellCount, bodyNotch, bodyPatternGeometry } from './bodyGeometry';
import { PATTERN_IDS, patternGeometry, type PatternId, type PatternShape } from './patterns';

const MIN_STROKE = 1.5;
const W = 24;
const H = 48;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Rasterise the body pattern to an ink mask (pixel centres). */
function mask(id: PatternId, w: number, h: number): boolean[] {
  const geo = bodyPatternGeometry(id, w, h, MIN_STROKE);
  const out: boolean[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out.push(
        geo.shapes.some((s: PatternShape) =>
          s.kind === 'line'
            ? distToSegment(x + 0.5, y + 0.5, s.x1, s.y1, s.x2, s.y2) <= geo.strokeWidth / 2
            : Math.hypot(x + 0.5 - s.cx, y + 0.5 - s.cy) <= s.r,
        ),
      );
    }
  }
  return out;
}

const coverage = (m: boolean[]): number => m.filter(Boolean).length / m.length;
const difference = (a: boolean[], b: boolean[]): number => a.filter((v, i) => v !== b[i]).length / a.length;

describe('bodyCellCount', () => {
  it('stacks two square cells in the 0.75 x 1.5 tile player body', () => {
    expect(bodyCellCount(W, H)).toBe(2);
  });

  it('is at least one for a square or wide box', () => {
    expect(bodyCellCount(24, 24)).toBe(1);
    expect(bodyCellCount(48, 24)).toBe(1);
  });
});

describe('bodyPatternGeometry', () => {
  it('uses the tile pattern at the cell size, once per cell', () => {
    for (const id of PATTERN_IDS) {
      const body = bodyPatternGeometry(id, W, H, MIN_STROKE);
      const tile = patternGeometry(id, W, MIN_STROKE);
      expect(body.cellSize).toBe(24);
      expect(body.cells).toBe(2);
      expect(body.strokeWidth).toBe(tile.strokeWidth);
      expect(body.shapes, id).toHaveLength(tile.shapes.length * 2);
    }
  });

  it('plain has no marks', () => {
    expect(bodyPatternGeometry('plain', W, H, MIN_STROKE).shapes).toHaveLength(0);
  });

  it('keeps every shape inside the body box', () => {
    for (const id of PATTERN_IDS) {
      for (const s of bodyPatternGeometry(id, W, H, MIN_STROKE).shapes) {
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
          expect(x, `${id} x`).toBeLessThanOrEqual(W + 1e-9);
          expect(y, `${id} y`).toBeGreaterThanOrEqual(-1e-9);
          expect(y, `${id} y`).toBeLessThanOrEqual(H + 1e-9);
        }
      }
    }
  });

  it('centres a narrower cell and spreads cells evenly when the box is not a whole number of squares', () => {
    const geo = bodyPatternGeometry('dots', 20, 52, MIN_STROKE);
    expect(geo.cells).toBe(3); // 52 / 20 = 2.6 rounds to 3
    expect(geo.cellSize).toBeCloseTo(52 / 3, 9); // slot (17.3) is narrower than the width
    const xs = geo.shapes.map((s) => (s.kind === 'dot' ? s.cx : NaN));
    expect(Math.min(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(20);
  });

  it('is deterministic', () => {
    expect(bodyPatternGeometry('crosshatch', W, H, MIN_STROKE)).toEqual(
      bodyPatternGeometry('crosshatch', W, H, MIN_STROKE),
    );
  });

  it('is readable at 24 x 48: 10 to 55 percent ink for every marked pattern', () => {
    for (const id of PATTERN_IDS.filter((p) => p !== 'plain')) {
      const c = coverage(mask(id, W, H));
      expect(c, id).toBeGreaterThanOrEqual(0.1);
      expect(c, id).toBeLessThanOrEqual(0.55);
    }
  });

  it('every pair of body patterns differs on at least 15 percent of pixels at 24 x 48', () => {
    const masks = PATTERN_IDS.map((id) => [id, mask(id, W, H)] as const);
    for (let i = 0; i < masks.length; i++) {
      for (let j = i + 1; j < masks.length; j++) {
        const a = masks[i];
        const b = masks[j];
        if (!a || !b) continue;
        expect(difference(a[1], b[1]), `${a[0]} vs ${b[0]}`).toBeGreaterThanOrEqual(0.15);
      }
    }
  });
});

describe('bodyNotch', () => {
  it('sits on the leading side, inside the outline', () => {
    expect(bodyNotch(W, H, 1, 2.5)).toEqual({ x: 14.5, y: 8, size: 5 });
    expect(bodyNotch(W, H, -1, 2.5)).toEqual({ x: 4.5, y: 8, size: 5 });
  });

  it('is absent without a facing and always inside the body', () => {
    expect(bodyNotch(W, H, 0, 2.5)).toBeNull();
    for (const f of [1, -1]) {
      const n = bodyNotch(W, H, f, 2.5);
      expect(n).not.toBeNull();
      if (!n) continue;
      expect(n.x).toBeGreaterThanOrEqual(2.5);
      expect(n.x + n.size).toBeLessThanOrEqual(W - 2.5);
      expect(n.y + n.size).toBeLessThanOrEqual(H);
    }
  });
});
