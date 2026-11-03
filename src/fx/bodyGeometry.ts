/**
 * Pure geometry for the non-square player body. The tile patterns are defined
 * for squares, so a tall body stacks square pattern cells, each one the exact
 * tile pattern at that cell size (so a 24 x 48 body shows two full 24 px tile
 * patterns). Coordinates are local to the body box (origin top-left). No Phaser.
 * Owner: art-director.
 */
import { patternGeometry, type PatternId, type PatternShape } from './patterns';

export interface BodyPattern {
  readonly shapes: readonly PatternShape[];
  /** Stroke width for `line` shapes, same units as the body box. */
  readonly strokeWidth: number;
  /** Side of each square pattern cell. */
  readonly cellSize: number;
  /** Number of cells stacked top to bottom. */
  readonly cells: number;
}

export interface BodyNotch {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** Number of square pattern cells that fit a `width` x `height` body (at least 1). */
export function bodyCellCount(width: number, height: number): number {
  return Math.max(1, Math.round(height / width));
}

function translate(s: PatternShape, dx: number, dy: number): PatternShape {
  return s.kind === 'line'
    ? { kind: 'line', x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
    : { kind: 'dot', cx: s.cx + dx, cy: s.cy + dy, r: s.r };
}

/**
 * Pattern marks for a body box: `bodyCellCount` square cells of side
 * min(width, height / cells), centred horizontally and spread evenly down the box.
 */
export function bodyPatternGeometry(id: PatternId, width: number, height: number, minStroke: number): BodyPattern {
  const cells = bodyCellCount(width, height);
  const slot = height / cells;
  const cellSize = Math.min(width, slot);
  const base = patternGeometry(id, cellSize, minStroke);
  const shapes: PatternShape[] = [];
  for (let i = 0; i < cells; i++) {
    const dx = (width - cellSize) / 2;
    const dy = i * slot + (slot - cellSize) / 2;
    for (const s of base.shapes) shapes.push(translate(s, dx, dy));
  }
  return { shapes, strokeWidth: base.strokeWidth, cellSize, cells };
}

/**
 * The small square that shows which way the body faces, near the top on the
 * leading side. Null when `facing` is 0.
 */
export function bodyNotch(width: number, height: number, facing: number, outlineWidth: number): BodyNotch | null {
  if (facing === 0) return null;
  const size = Math.max(3, Math.round(width * 0.2));
  const inset = outlineWidth + 2;
  const x = facing > 0 ? width - inset - size : inset;
  return { x, y: Math.round(height / 6), size };
}
