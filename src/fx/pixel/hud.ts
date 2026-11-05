/**
 * HUD glyphs for the two Tandem bodies: a silhouette per body (white mask, for the gear strips),
 * the home glyph, and the camera's edge arrow that points at an off-screen body. The silhouettes
 * are the same shapes as the sprites (flat head and wide visor for the runner; antenna and two
 * eyes for the twin), so the HUD, the arrow and the body all say the same thing without colour.
 * Pure; no Phaser. Owner: art-director.
 */
import type { BandColor } from '../../core/types';
import { hexToRgb } from '../color';
import { pixelPatternOn } from '../patterns';
import { palette, patternOf } from '../palette';
import { createRaster, fillRect, rgba, setPixel, type Raster, type Rgba } from './raster';
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

/** Left edge of the body silhouette, and the pattern swatch box, inside the 22 x 16 arrow. */
const ARROW_GLYPH_X = 2;
const ARROW_SWATCH = { x: 10, y: 3, w: 6, h: 10 } as const;

function outlinedArrow(): Raster {
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
  return r;
}

/**
 * Edge arrow pointing right at a body beyond the screen edge, 22 x 16: a 1 px `ui.text` outline
 * around a `ui.panel` fill, the body's silhouette at the left and, beside it, a 6 x 10 swatch of
 * the band's tile pattern (the same ink cells as the tiles and HUD: stripes, dots, chevrons,
 * checker; plain white is a solid block). Draw it flipped (flipX) at the left edge. The shape and
 * the silhouette say which body, the swatch pattern says which gear: the colour is a third signal.
 */
export function bakeEdgeArrow(body: Variant, band: BandColor): Raster {
  const r = outlinedArrow();
  const fill = rgba(hexToRgb(palette.gears[band].solid.fill));
  const ink = rgba(hexToRgb(palette.ui.panel));
  const glyph = fromRows(BODY_GLYPHS[body], fill);
  for (let y = 0; y < glyph.height; y++) {
    for (let x = 0; x < glyph.width; x++) {
      if ((glyph.data[(y * glyph.width + x) * 4 + 3] ?? 0) > 0) setPixel(r, ARROW_GLYPH_X + x, 2 + y, fill);
    }
  }
  const id = patternOf(band);
  const s = ARROW_SWATCH;
  for (let j = 0; j < s.h; j++) {
    for (let i = 0; i < s.w; i++) setPixel(r, s.x + i, s.y + j, pixelPatternOn(id, i, j, s.w) ? ink : fill);
  }
  return r;
}

/** The pattern swatch box of the band arrow, for tests: where the band's pattern is drawn. */
export const EDGE_ARROW_SWATCH = ARROW_SWATCH;

/**
 * Edge arrow for the exit, 22 x 16, same outline: a doorway (white frame, arched top, dark
 * opening, a spark in it) in the exit's own colours, no band, no body glyph. It is told apart from
 * the body arrows by shape alone: a tall hollow door with a dark core, and no swatch.
 */
export function bakeExitArrow(): Raster {
  const r = outlinedArrow();
  const e = palette.pixel.exit;
  const white = rgba(hexToRgb(e.frame));
  const dark = rgba(hexToRgb(e.doorway));
  fillRect(r, 5, 3, 10, 11, white);
  fillRect(r, 7, 2, 6, 1, white);
  fillRect(r, 7, 5, 6, 9, dark);
  fillRect(r, 6, 6, 8, 8, dark);
  for (const [x, y] of [[10, 9], [9, 9], [11, 9], [10, 8], [10, 10]] as const) setPixel(r, x, y, white);
  return r;
}
