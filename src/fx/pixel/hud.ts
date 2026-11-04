/**
 * HUD glyphs for the two Tandem bodies: a silhouette per body (white mask, for the gear strips),
 * the home glyph, and the camera's edge arrow that points at an off-screen body. The silhouettes
 * are the same shapes as the sprites (flat head and wide visor for the runner; antenna and two
 * eyes for the twin), so the HUD, the arrow and the body all say the same thing without colour.
 * Pure; no Phaser. Owner: art-director.
 */
import type { BandColor } from '../../core/types';
import { hexToRgb } from '../color';
import { palette } from '../palette';
import { createRaster, rgba, setPixel, type Raster, type Rgba } from './raster';
import type { Variant } from './playerBody';

export const GLYPH_BODY_W = 7;
export const GLYPH_BODY_H = 12;
export const GLYPH_HOME_SIZE = 7;
export const EDGE_ARROW_W = 22;
export const EDGE_ARROW_H = 16;

const BODY_GLYPHS: Readonly<Record<Variant, readonly string[]>> = {
  runner: [
    '.#####.',
    '#######',
    '##....#',
    '#######',
    '#######',
    '#######',
    '#######',
    '#######',
    '#######',
    '.##.##.',
    '.##.##.',
    '.##.##.',
  ],
  twin: [
    '...#...',
    '...#...',
    '.#####.',
    '#######',
    '##.#.##',
    '##.#.##',
    '#######',
    '#######',
    '#######',
    '#######',
    '##...##',
    '##...##',
  ],
};

const HOME_GLYPH: readonly string[] = ['...#...', '..###..', '.#####.', '#######', '.##.##.', '.##.##.', '.##.##.'];

const WHITE: Rgba = [255, 255, 255, 255];

function fromRows(rows: readonly string[], on: Rgba): Raster {
  const r = createRaster(rows[0]?.length ?? 0, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') setPixel(r, x, y, on);
  });
  return r;
}

/** Silhouette of one body as a white mask 7 x 12: tint it at runtime. */
export function bakeBodyGlyph(body: Variant): Raster {
  return fromRows(BODY_GLYPHS[body], WHITE);
}

/** The home (parked) glyph, a white 7 x 7 mask. */
export function bakeHomeGlyph(): Raster {
  return fromRows(HOME_GLYPH, WHITE);
}

/**
 * Edge arrow pointing right at a body beyond the screen edge, 22 x 16: a 1 px `ui.text` outline
 * around a `ui.panel` fill, the body's silhouette inside in the band's fill colour. Draw it
 * flipped (flipX) at the left edge. The shape and the silhouette carry the meaning; the colour only
 * says which gear that body is in.
 */
export function bakeEdgeArrow(body: Variant, band: BandColor): Raster {
  const r = createRaster(EDGE_ARROW_W, EDGE_ARROW_H);
  const edge = rgba(hexToRgb(palette.ui.text));
  const panel = rgba(hexToRgb(palette.ui.panel));
  const endX = (y: number): number => EDGE_ARROW_W - 1 - Math.floor(Math.abs(y - (EDGE_ARROW_H - 1) / 2));
  const inside = (x: number, y: number): boolean => y >= 0 && y < EDGE_ARROW_H && x >= 0 && x <= endX(y);
  for (let y = 0; y < EDGE_ARROW_H; y++) {
    for (let x = 0; x <= endX(y); x++) {
      const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      setPixel(r, x, y, rim ? edge : panel);
    }
  }
  const fill = rgba(hexToRgb(palette.gears[band].solid.fill));
  const glyph = fromRows(BODY_GLYPHS[body], fill);
  for (let y = 0; y < glyph.height; y++) {
    for (let x = 0; x < glyph.width; x++) {
      const i = (y * glyph.width + x) * 4;
      if ((glyph.data[i + 3] ?? 0) > 0) setPixel(r, 4 + x, 2 + y, fill);
    }
  }
  return r;
}
