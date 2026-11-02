/**
 * Render-only tile treatments: draws a gear tile (solid or ghost), the safe
 * tile, or a HUD glyph onto a Phaser Graphics object. Reads palette.json and
 * the pure geometry in patterns.ts; never touches simulation state.
 * Owner: art-director.
 */
import type Phaser from 'phaser';
import type { BandColor } from '../core/types';
import { hexToNumber } from './color';
import { dashedRectSegments, patternGeometry, type PatternId, type PatternShape } from './patterns';
import { palette, patternOf, type TileMode } from './palette';

/**
 * The slice of Phaser.GameObjects.Graphics that tile drawing needs. Declared
 * structurally so the drawing code can be unit-tested with a recorder.
 */
export interface TileCanvas {
  fillStyle(color: number, alpha?: number): unknown;
  fillRect(x: number, y: number, width: number, height: number): unknown;
  fillCircle(x: number, y: number, radius: number): unknown;
  lineStyle(width: number, color: number, alpha?: number): unknown;
  strokeRect(x: number, y: number, width: number, height: number): unknown;
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
}

/** Type-checked bridge: fails to compile if Phaser's Graphics stops satisfying `TileCanvas`. */
export function asTileCanvas(graphics: Phaser.GameObjects.Graphics): TileCanvas {
  return graphics;
}

function drawPattern(
  g: TileCanvas,
  id: PatternId,
  x: number,
  y: number,
  size: number,
  ink: number,
  inkAlpha: number,
): void {
  const geo = patternGeometry(id, size, palette.pattern.minStrokePx);
  if (geo.shapes.length === 0) return;
  g.lineStyle(geo.strokeWidth, ink, inkAlpha);
  g.fillStyle(ink, inkAlpha);
  geo.shapes.forEach((s: PatternShape) => {
    if (s.kind === 'line') g.lineBetween(x + s.x1, y + s.y1, x + s.x2, y + s.y2);
    else g.fillCircle(x + s.cx, y + s.cy, s.r);
  });
}

function drawOutline(
  g: TileCanvas,
  x: number,
  y: number,
  size: number,
  color: number,
  width: number,
  dash: readonly number[] | null,
): void {
  const half = width / 2;
  g.lineStyle(width, color, 1);
  if (!dash) {
    g.strokeRect(x + half, y + half, size - width, size - width);
    return;
  }
  const [dashLen = 4, gapLen = 3] = dash;
  for (const s of dashedRectSegments(x + half, y + half, size - width, size - width, dashLen, gapLen)) {
    g.lineBetween(s.x1, s.y1, s.x2, s.y2);
  }
}

/**
 * Draw one gear-coloured tile at pixel (x, y), `size` px square.
 * - `solid`: opaque fill, bright solid outline, dark pattern marks.
 * - `ghost`: faint fill, dimmer dashed outline, pattern marks in the outline colour.
 */
export function drawGearTile(
  g: TileCanvas,
  color: BandColor,
  mode: TileMode,
  x: number,
  y: number,
  size: number,
): void {
  const style = palette.gears[color][mode];
  const t = palette.treatment[mode];
  g.fillStyle(hexToNumber(style.fill), t.fillAlpha);
  g.fillRect(x, y, size, size);
  drawPattern(g, patternOf(color), x, y, size, hexToNumber(style.ink), t.inkAlpha);
  drawOutline(g, x, y, size, hexToNumber(style.outline), t.outlineWidth, t.dash);
}

/** The always-solid safe tile (`#`): flat grey, solid outline, no pattern. */
export function drawSafeTile(g: TileCanvas, x: number, y: number, size: number): void {
  g.fillStyle(hexToNumber(palette.safeTile.fill), 1);
  g.fillRect(x, y, size, size);
  drawOutline(g, x, y, size, hexToNumber(palette.safeTile.outline), palette.treatment.solid.outlineWidth, null);
}

/**
 * Small badge for the HUD gear meter and the player body: the solid treatment
 * at any size. Same colours and pattern as the tiles, so the HUD teaches the world.
 */
export function drawGearGlyph(g: TileCanvas, color: BandColor, x: number, y: number, size: number): void {
  drawGearTile(g, color, 'solid', x, y, size);
}
