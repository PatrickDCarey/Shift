/**
 * Pixel shapes for the HUD gear meter as lists of whole-pixel rectangles, so the
 * view only calls `fillRect` (no strokes, no triangles: those antialias or land on
 * half pixels at 480 x 270). Pure; no Phaser.
 *
 * Owner: ui-engineer.
 */
import type { PatternId } from '../fx/patterns';
import { pixelPatternOn } from '../fx/patterns';
import type { Rect } from './gearMeterPlan';

const px = (x: number, y: number, w = 1, h = 1): Rect => ({ x, y, w, h });

/** A `width`-px frame drawn inside `r` (four rectangles, corners not doubled). */
export function ringRects(r: Rect, width: number): readonly Rect[] {
  const t = Math.max(1, Math.min(width, Math.floor(Math.min(r.w, r.h) / 2)));
  return [
    px(r.x, r.y, r.w, t),
    px(r.x, r.y + r.h - t, r.w, t),
    px(r.x, r.y + t, t, r.h - 2 * t),
    px(r.x + r.w - t, r.y + t, t, r.h - 2 * t),
  ];
}

/** A 1 px dashed frame: `on` px drawn, `off` px skipped, starting with a dash at every corner. */
export function dashedRingRects(r: Rect, on: number, off: number): readonly Rect[] {
  const period = Math.max(1, on + off);
  const dash = (i: number, n: number): boolean => i % period < on || i < on || i >= n - on;
  const out: Rect[] = [];
  for (let i = 0; i < r.w; i += 1) {
    if (!dash(i, r.w)) continue;
    out.push(px(r.x + i, r.y), px(r.x + i, r.y + r.h - 1));
  }
  for (let j = 1; j < r.h - 1; j += 1) {
    if (!dash(j, r.h)) continue;
    out.push(px(r.x, r.y + j), px(r.x + r.w - 1, r.y + j));
  }
  return out;
}

/** Upward needle: row r (from the apex) is 2r + 1 wide, centred on column `x`. */
export function needleRects(x: number, top: number, h: number): readonly Rect[] {
  return Array.from({ length: Math.max(0, h) }, (_, r) => px(x - r, top + r, 2 * r + 1));
}

/** Little triangle under a key-cap column: `w` wide, narrowing by 2 px a row, `down` or `up`. */
export function arrowRects(r: Rect, dir: 'down' | 'up'): readonly Rect[] {
  const rows: Rect[] = [];
  for (let i = 0; i < r.h; i += 1) {
    const w = Math.max(1, r.w - 2 * i);
    const y = dir === 'down' ? r.y + i : r.y + r.h - 1 - i;
    rows.push(px(r.x + Math.floor((r.w - w) / 2), y, w));
  }
  return rows;
}

/** A left-pointing chevron `w` x `h` (3 x 5: `..#`, `.#.`, `#..`, `.#.`, `..#`). */
export function chevronRects(x: number, y: number, w: number, h: number): readonly Rect[] {
  const mid = (h - 1) / 2;
  return Array.from({ length: h }, (_, j) => {
    const d = Math.min(w - 1, Math.round(Math.abs(j - mid) * ((w - 1) / Math.max(1, mid))));
    return px(x + d, y + j);
  });
}

/** A right-pointing chevron `w` x `h`, the mirror of `chevronRects`: its tip is the right column. */
export function rightChevronRects(x: number, y: number, w: number, h: number): readonly Rect[] {
  return chevronRects(x, y, w, h).map((r) => ({ ...r, x: x + (w - 1) - (r.x - x) }));
}

/** 1 px dots on every other column from `from` up to (not including) `to`. */
export function dottedRowRects(from: number, to: number, y: number): readonly Rect[] {
  const dots: Rect[] = [];
  for (let x = from; x < to; x += 2) dots.push(px(x, y));
  return dots;
}

/** Pattern ink of a `size` x `size` cell, as 1 px rects (the non-colour signal). */
export function patternInk(id: PatternId, size: number): readonly Rect[] {
  const out: Rect[] = [];
  for (let j = 0; j < size; j += 1) {
    for (let i = 0; i < size; i += 1) if (pixelPatternOn(id, i, j, size)) out.push(px(i, j));
  }
  return out;
}

/** Only the rim of each pattern mark: what a ghost (unlit) cell shows, so it stays lighter than a lit one. */
export function patternRim(id: PatternId, size: number): readonly Rect[] {
  const on = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < size && j < size && pixelPatternOn(id, i, j, size);
  return patternInk(id, size).filter(({ x, y }) => !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1));
}
