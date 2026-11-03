/**
 * Direction C tiles: colour-blind readability of the pixel patterns (the
 * pattern is read back out of the baked pixels under greyscale and each
 * dichromacy), solid vs ghost, the lit ledge edge, the exit, and contrast of
 * every tile colour against every background colour that can sit behind it.
 */
import { describe, expect, it } from 'vitest';
import type { BandColor } from '../../core/types';
import { CVD_TYPES, contrastRatio, hexToRgb, linearToSrgb, relativeLuminance, simulateCvd, srgbToLinear, type Rgb } from '../color';
import { palette, patternOf } from '../palette';
import { PIXEL_CELLS, pixelPatternMask, pixelPatternOn, PATTERN_IDS, type PatternId } from '../patterns';
import { getPixel, type Raster } from './raster';
import { sceneryColors } from './scenery';
import { TILE, bakeExitDoor, bakeGhostTile, bakeSafeTile, bakeSolidTile, neighboursOf } from './tiles';

const COLORED: readonly BandColor[] = ['blue', 'green', 'yellow', 'red'];
const NONE = neighboursOf(0);
const PAT_X = 2;
const PAT_Y = 4;
type Vision = 'normal' | 'greyscale' | (typeof CVD_TYPES)[number];
const VISIONS: readonly Vision[] = ['normal', 'greyscale', ...CVD_TYPES];

const rgbAt = (r: Raster, x: number, y: number): Rgb => {
  const p = getPixel(r, x, y);
  return { r: p[0], g: p[1], b: p[2] };
};

function seen(c: Rgb, v: Vision): Rgb {
  if (v === 'normal') return c;
  if (v === 'greyscale') {
    const y = relativeLuminance(c);
    const g = linearToSrgb(y);
    return { r: g, g, b: g };
  }
  return simulateCvd(c, v);
}

/** Read the ink mask of a solid tile as a viewer in vision `v` would: pixels clearly different from the fill. */
function solidMask(tile: Raster, fill: Rgb, v: Vision): boolean[] {
  const out: boolean[] = [];
  for (let j = 0; j < PIXEL_CELLS.tile.height; j++) {
    for (let i = 0; i < PIXEL_CELLS.tile.width; i++) {
      out.push(contrastRatio(seen(rgbAt(tile, PAT_X + i, PAT_Y + j), v), seen(fill, v)) >= 1.5);
    }
  }
  return out;
}

/** Read the ink mask of a ghost tile: opaque pixels that are not the dithered wash. */
function ghostMask(tile: Raster): boolean[] {
  const out: boolean[] = [];
  for (let j = 0; j < PIXEL_CELLS.tile.height; j++) {
    for (let i = 0; i < PIXEL_CELLS.tile.width; i++) out.push(getPixel(tile, PAT_X + i, PAT_Y + j)[3] === 255);
  }
  return out;
}

const hamming = (a: readonly boolean[], b: readonly boolean[]): number => a.filter((v, i) => v !== b[i]).length / a.length;

function nearestPattern(mask: boolean[]): PatternId {
  let best: PatternId = 'plain';
  let bestD = Infinity;
  for (const id of PATTERN_IDS) {
    const d = hamming(mask, pixelPatternMask(id, PIXEL_CELLS.tile.width, PIXEL_CELLS.tile.height));
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

describe('pixel tiles read in greyscale and under each dichromacy', () => {
  it.each(VISIONS)('pattern ink is at least 3:1 against the fill of every solid tile (%s)', (v) => {
    for (const band of COLORED) {
      const fill = hexToRgb(palette.gears[band].solid.fill);
      const tile = bakeSolidTile(band, NONE);
      let worst = Infinity;
      for (let j = 0; j < PIXEL_CELLS.tile.height; j++) {
        for (let i = 0; i < PIXEL_CELLS.tile.width; i++) {
          if (pixelPatternOn(patternOf(band), i, j, PIXEL_CELLS.tile.width)) {
            worst = Math.min(worst, contrastRatio(seen(rgbAt(tile, PAT_X + i, PAT_Y + j), v), seen(fill, v)));
          }
        }
      }
      expect(worst, `${band} under ${v}`).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(VISIONS)('the band can be told from the tile pixels alone, with no colour hint (%s)', (v) => {
    for (const band of COLORED) {
      const fill = hexToRgb(palette.gears[band].solid.fill);
      expect(nearestPattern(solidMask(bakeSolidTile(band, NONE), fill, v)), `${band} under ${v}`).toBe(patternOf(band));
    }
  });

  it('ghost tiles of different bands differ on at least 15 percent of the pattern cell', () => {
    for (let a = 0; a < COLORED.length; a++) {
      for (let b = a + 1; b < COLORED.length; b++) {
        const d = hamming(ghostMask(bakeGhostTile(COLORED[a] as BandColor)), ghostMask(bakeGhostTile(COLORED[b] as BandColor)));
        expect(d, `${COLORED[a]} vs ${COLORED[b]}`).toBeGreaterThanOrEqual(0.15);
      }
    }
  });

  it('ghost marks stay inside the solid marks (hollow rims of the same pattern)', () => {
    for (const band of COLORED) {
      const g = ghostMask(bakeGhostTile(band));
      const full = pixelPatternMask(patternOf(band), PIXEL_CELLS.tile.width, PIXEL_CELLS.tile.height);
      g.forEach((on, i) => {
        if (on) expect(full[i], `${band} cell ${i}`).toBe(true);
      });
      expect(g.filter(Boolean).length, band).toBeGreaterThan(10);
    }
  });
});

describe('solid versus ghost differs in more than hue', () => {
  const opaque = (r: Raster): number => {
    let n = 0;
    for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (getPixel(r, x, y)[3] === 255) n++;
    return n / (r.width * r.height);
  };

  it('a solid tile is fully opaque and a ghost tile is mostly see-through', () => {
    for (const band of COLORED) {
      expect(opaque(bakeSolidTile(band, NONE)), band).toBe(1);
      expect(opaque(bakeGhostTile(band)), band).toBeLessThan(0.45);
    }
  });

  it('solid has a lit top edge brighter than its fill; ghost has none', () => {
    for (const band of COLORED) {
      const fill = relativeLuminance(hexToRgb(palette.gears[band].solid.fill));
      const solid = bakeSolidTile(band, NONE);
      for (const y of [1, 2]) {
        expect(relativeLuminance(rgbAt(solid, 8, y)), `${band} lip row ${y}`).toBeGreaterThan(fill);
      }
      const ghost = bakeGhostTile(band);
      for (const y of [1, 2]) expect(getPixel(ghost, 8, y)[3], `${band} ghost row ${y}`).toBeLessThan(255);
    }
  });

  it('the safe tile has a lit top lip, carries no pattern and is the only plain tile', () => {
    const safe = bakeSafeTile(NONE, 0);
    const fill = relativeLuminance(hexToRgb(palette.safeTile.fill));
    expect(relativeLuminance(rgbAt(safe, 8, 1))).toBeGreaterThan(fill);
    const colours = new Set<string>();
    for (let j = 0; j < PIXEL_CELLS.tile.height; j++) {
      for (let i = 0; i < PIXEL_CELLS.tile.width; i++) colours.add(getPixel(safe, PAT_X + i, PAT_Y + j).join(','));
    }
    expect(colours.size, 'fill plus the rivets only').toBeLessThanOrEqual(3);
  });

  it('only exposed edges get an outline: a tile with all four neighbours has none', () => {
    const open = bakeSafeTile(NONE, 0);
    const closed = bakeSafeTile(neighboursOf(15), 0);
    expect(getPixel(open, 0, 8)).not.toEqual(getPixel(closed, 0, 8));
    expect(getPixel(closed, 0, 0)).toEqual(getPixel(closed, 5, 8));
  });
});

describe('contrast against every background colour that can sit behind a tile', () => {
  const speeds = Array.from({ length: 49 }, (_, i) => i / 4);
  const flat = speeds.flatMap((s) => {
    const c = sceneryColors(s, 12);
    return [c.base, c.hue, c.ridgeFar, c.ridgeNear];
  });
  const stars = speeds.map((s) => sceneryColors(s, 12).star);
  const backs = [...flat, ...stars];
  const worst = (c: Rgb, list: readonly Rgb[] = backs): number => Math.min(...list.map((b) => contrastRatio(c, b)));

  it('solid fills and the safe fill are at least 3:1 against the flat decor, and every outline against all decor including stars', () => {
    for (const band of ['white', ...COLORED] as const) {
      expect(worst(hexToRgb(palette.gears[band].solid.fill), flat), `${band} fill`).toBeGreaterThanOrEqual(3);
      expect(worst(hexToRgb(palette.gears[band].solid.outline)), `${band} outline`).toBeGreaterThanOrEqual(3);
    }
    expect(worst(hexToRgb(palette.safeTile.fill), flat)).toBeGreaterThanOrEqual(3);
    expect(worst(hexToRgb(palette.safeTile.outline))).toBeGreaterThanOrEqual(3);
  });

  it('ghost outlines, in the baked pixels, are at least 3:1 at every speed', () => {
    for (const band of COLORED) {
      const ghost = bakeGhostTile(band);
      for (const x of [0, 1, 2, 15]) expect(worst(rgbAt(ghost, x, 0)), `${band} dash pixel ${x}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('the exit frame is at least 4.5:1 against every background, its doorway and the safe tile', () => {
    const door = bakeExitDoor(0);
    const frame = rgbAt(door, 2, 8);
    expect(frame).toEqual({ r: 255, g: 255, b: 255 });
    expect(worst(frame)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(frame, rgbAt(door, 8, 12))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(frame, hexToRgb(palette.safeTile.fill))).toBeGreaterThanOrEqual(4.5);
  });

  it('no band colour is the exit white, and the exit pulse changes the sparkle', () => {
    for (const band of ['white', ...COLORED] as const) expect(palette.gears[band].solid.fill.toUpperCase()).not.toBe('#FFFFFF');
    expect(bakeExitDoor(0).data).not.toEqual(bakeExitDoor(1).data);
  });
});

describe('tile bakers', () => {
  it('are 16 px square and deterministic', () => {
    expect(TILE).toBe(16);
    expect(bakeSolidTile('red', NONE).data).toEqual(bakeSolidTile('red', NONE).data);
    expect(bakeSolidTile('red', NONE).width).toBe(16);
  });

  it('linear and sRGB helpers round-trip (guards the greyscale conversion)', () => {
    expect(Math.round(linearToSrgb(srgbToLinear(128)))).toBe(128);
  });
});
