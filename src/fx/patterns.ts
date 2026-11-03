/**
 * Pure pattern geometry for the per-gear tile/HUD glyphs. No Phaser, no DOM.
 * Coordinates are local to a square of side `size` (origin top-left), so the
 * same function serves a 32 px tile and a 16 px HUD badge. Owner: art-director.
 */

export type PatternId = 'plain' | 'stripes' | 'dots' | 'chevrons' | 'checker';

export const PATTERN_IDS: readonly PatternId[] = ['plain', 'stripes', 'dots', 'chevrons', 'checker'];

export interface LineShape {
  readonly kind: 'line';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface DotShape {
  readonly kind: 'dot';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

export type PatternShape = LineShape | DotShape;

export interface PatternGeometry {
  readonly shapes: readonly PatternShape[];
  /** Stroke width, same units as `size`, for `line` shapes. */
  readonly strokeWidth: number;
}

/** Sizes below this use a coarser version of the pattern so it stays legible. */
export const SMALL_SIZE = 24;

const line = (x1: number, y1: number, x2: number, y2: number): LineShape => ({ kind: 'line', x1, y1, x2, y2 });

/** Liang-Barsky clip of a segment to the square [0,size]^2. Null if fully outside. */
export function clipLineToSquare(l: LineShape, size: number): LineShape | null {
  const dx = l.x2 - l.x1;
  const dy = l.y2 - l.y1;
  const p = [-dx, dx, -dy, dy];
  const q = [l.x1, size - l.x1, l.y1, size - l.y1];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    const pi = p[i] ?? 0;
    const qi = q[i] ?? 0;
    if (pi === 0) {
      if (qi < 0) return null;
    } else {
      const t = qi / pi;
      if (pi < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  if (t0 > t1) return null;
  return line(l.x1 + t0 * dx, l.y1 + t0 * dy, l.x1 + t1 * dx, l.y1 + t1 * dy);
}

function stripes(size: number, minStroke: number): PatternGeometry {
  const n = size >= SMALL_SIZE ? 4 : 3;
  const strokeWidth = Math.max(minStroke, size / 10);
  const inset = size * 0.12;
  const shapes: PatternShape[] = [];
  for (let i = 0; i < n; i++) {
    const y = (size * (i + 0.5)) / n;
    shapes.push(line(inset, y, size - inset, y));
  }
  return { shapes, strokeWidth };
}

function dots(size: number, minStroke: number): PatternGeometry {
  const n = size >= SMALL_SIZE ? 3 : 2;
  const r = Math.max(minStroke * 0.8, size * (n === 3 ? 0.085 : 0.12));
  const shapes: PatternShape[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      shapes.push({ kind: 'dot', cx: (size * (col + 0.5)) / n, cy: (size * (row + 0.5)) / n, r });
    }
  }
  return { shapes, strokeWidth: minStroke };
}

function chevrons(size: number, minStroke: number): PatternGeometry {
  const rows = size >= SMALL_SIZE ? 3 : 2;
  const strokeWidth = Math.max(minStroke * 1.25, size / 14);
  const shapes: PatternShape[] = [];
  for (let i = 0; i < rows; i++) {
    const yc = (size * (i + 0.5)) / rows;
    const h = size * 0.11;
    shapes.push(line(size * 0.18, yc + h, size * 0.5, yc - h));
    shapes.push(line(size * 0.5, yc - h, size * 0.82, yc + h));
  }
  return { shapes, strokeWidth };
}

/**
 * Checkerboard: 2 x 2 cells under 24 px, 4 x 4 above, ink on the cells where
 * row + column is even (50% coverage). Each ink cell is one thick horizontal
 * line, as wide as the cell is tall with butt caps, so it draws as a square.
 * It replaced the crosshatch because a lattice reads as a grating or a hazard
 * (design-lead decision, 2026-11-03), and a checker is a block pattern.
 */
function checker(size: number, minStroke: number): PatternGeometry {
  const n = size >= SMALL_SIZE ? 4 : 2;
  const cell = size / n;
  const shapes: PatternShape[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if ((r + c) % 2 === 0) shapes.push(line(c * cell, (r + 0.5) * cell, (c + 1) * cell, (r + 0.5) * cell));
    }
  }
  return { shapes, strokeWidth: Math.max(minStroke, cell) };
}

/**
 * Shapes that make up pattern `id` inside a `size` x `size` square.
 * `minStroke` is the thinnest line worth drawing, in pixels (palette.pattern.minStrokePx).
 */
export function patternGeometry(id: PatternId, size: number, minStroke: number): PatternGeometry {
  switch (id) {
    case 'plain':
      return { shapes: [], strokeWidth: minStroke };
    case 'stripes':
      return stripes(size, minStroke);
    case 'dots':
      return dots(size, minStroke);
    case 'chevrons':
      return chevrons(size, minStroke);
    case 'checker':
      return checker(size, minStroke);
  }
}

export function isPatternId(value: string): value is PatternId {
  return (PATTERN_IDS as readonly string[]).includes(value);
}

/**
 * Segments of a dashed rectangle outline, clockwise from the top-left. The dash
 * pattern restarts on each side so every corner begins with a dash.
 */
export function dashedRectSegments(
  x: number,
  y: number,
  w: number,
  h: number,
  dash: number,
  gap: number,
): readonly LineShape[] {
  const sides: ReadonlyArray<readonly [number, number, number, number]> = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ];
  const out: LineShape[] = [];
  for (const [ax, ay, bx, by] of sides) {
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    for (let d = 0; d < len; d += dash + gap) {
      const e = Math.min(d + dash, len);
      out.push(line(ax + ux * d, ay + uy * d, ax + ux * e, ay + uy * e));
    }
  }
  return out;
}

// ---- Pixel patterns (direction C) -----------------------------------------------
//
// Hand-placed, integer-grid versions of the five patterns for the 16 px tile
// art. Every feature is at least 2 px thick (so it survives 2x integer scaling
// and a shrunken iframe), the four marked patterns differ in structure (bars,
// dot matrix, diagonal chevrons, big checker) and not just density, and any two
// differ on at least 30% of pixels whatever phase they are drawn at.

/** Pattern cells the 16 px pixel art uses, in pixels: tile body, player torso, HUD cell. */
export const PIXEL_CELLS = {
  tile: { width: 12, height: 10 },
  body: { width: 10, height: 11 },
  hud: { width: 12, height: 8 },
} as const;

const wrap = (a: number, n: number): number => ((a % n) + n) % n;

/**
 * Whether pixel (i, j) of a `width`-wide pattern cell is ink. i and j may be any
 * integer (patterns repeat), so a cell can sit at any phase. Chevrons are
 * centred on the cell width, so they do not shift sideways.
 */
export function pixelPatternOn(id: PatternId, i: number, j: number, width: number): boolean {
  switch (id) {
    case 'plain':
      return false;
    case 'stripes':
      return wrap(j, 5) < 2;
    case 'dots':
      return wrap(i, 4) < 2 && wrap(j, 3) < 2;
    case 'chevrons':
      return wrap(j - Math.min(5, Math.round(Math.abs(i - (width - 1) / 2))), 5) < 2;
    case 'checker':
      return (Math.floor(i / 4) + Math.floor(j / 4)) % 2 === 0;
  }
}

/** Ink mask (row-major, `width` x `height`) of a pixel pattern cell, shifted by (shiftX, shiftY) pixels of phase. */
export function pixelPatternMask(
  id: PatternId,
  width: number,
  height: number,
  shiftX = 0,
  shiftY = 0,
): readonly boolean[] {
  const out: boolean[] = [];
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      out.push(pixelPatternOn(id, id === 'chevrons' ? i : i + shiftX, j + shiftY, width));
    }
  }
  return out;
}
