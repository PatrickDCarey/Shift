/**
 * M2-14b: the pixel patterns at the real tile size (16 px, pattern cell 12 x 10)
 * read back from the baked pixels in greyscale, with the checker (red) against
 * the dots (green) as the pair design-lead asked about, also at half scale
 * (a 2x2 average, the view of an iframe shrunk below 1x) and for ghost tiles.
 * Numbers are written up in docs/art/accessibility.md section 11.
 */
import { describe, expect, it } from 'vitest';
import type { BandColor } from '../../core/types';
import { contrastRatio, hexToRgb, linearToSrgb, relativeLuminance, type Rgb } from '../color';
import { palette, patternOf } from '../palette';
import { PIXEL_CELLS, pixelPatternMask } from '../patterns';
import { getPixel, type Raster } from './raster';
import { TILE, bakeGhostTile, bakeSolidTile, neighboursOf } from './tiles';

const COLORED: readonly BandColor[] = ['blue', 'green', 'yellow', 'red'];
const PAT_X = 2;
const PAT_Y = 4;
const W = PIXEL_CELLS.tile.width;
const H = PIXEL_CELLS.tile.height;
const NONE = neighboursOf(0);
/** A pixel counts as ink in greyscale when its grey level differs from the fill's by this many of 255. */
const GREY_STEP = 25;

const grey = (c: Rgb): number => linearToSrgb(relativeLuminance(c));
const rgbAt = (r: Raster, x: number, y: number): Rgb => {
  const p = getPixel(r, x, y);
  return { r: p[0], g: p[1], b: p[2] };
};

/** Greyscale ink mask of a solid 16 px tile's pattern cell, as a person who sees no hue reads it. */
function greyMask(band: BandColor): boolean[] {
  const fill = grey(hexToRgb(palette.gears[band].solid.fill));
  const tile = bakeSolidTile(band, NONE);
  const out: boolean[] = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) out.push(Math.abs(grey(rgbAt(tile, PAT_X + i, PAT_Y + j)) - fill) > GREY_STEP);
  return out;
}

function ghostMask(band: BandColor): boolean[] {
  const tile = bakeGhostTile(band);
  const out: boolean[] = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) out.push(getPixel(tile, PAT_X + i, PAT_Y + j)[3] === 255);
  return out;
}

const hamming = (a: readonly boolean[], b: readonly boolean[]): number => a.filter((v, i) => v !== b[i]).length / a.length;

/** Ink coverage per 2x2 block (what a half-scale view shows). */
function halfScale(mask: readonly boolean[]): number[] {
  const out: number[] = [];
  const at = (x: number, y: number): number => (mask[y * W + x] ? 1 : 0);
  for (let j = 0; j < H; j += 2) {
    for (let i = 0; i < W; i += 2) out.push((at(i, j) + at(i + 1, j) + at(i, j + 1) + at(i + 1, j + 1)) / 4);
  }
  return out;
}

const meanAbsDiff = (a: readonly number[], b: readonly number[]): number => a.reduce((s, v, i) => s + Math.abs(v - (b[i] ?? 0)), 0) / a.length;

/** Longest run of ink pixels along a row: the feature size of the pattern. */
function longestRun(mask: readonly boolean[]): number {
  let best = 0;
  for (let j = 0; j < H; j++) {
    let run = 0;
    for (let i = 0; i < W; i++) {
      run = mask[j * W + i] ? run + 1 : 0;
      best = Math.max(best, run);
    }
  }
  return best;
}

describe('16 px solid tiles in greyscale', () => {
  it('the baked tile is 16 px and the pattern cell is 12 x 10', () => {
    expect(TILE).toBe(16);
    expect([W, H]).toEqual([12, 10]);
  });

  it.each(COLORED)('%s: the greyscale ink mask is exactly the pixel pattern', (band) => {
    const id = patternOf(band);
    expect(hamming(greyMask(band), pixelPatternMask(id, W, H))).toBe(0);
  });

  it('checker (red) vs dots (green): at least 40 percent of the pattern cell differs, at 1x and at half scale', () => {
    const red = greyMask('red');
    const green = greyMask('green');
    expect(hamming(red, green)).toBeGreaterThanOrEqual(0.4);
    expect(meanAbsDiff(halfScale(red), halfScale(green))).toBeGreaterThanOrEqual(0.4);
  });

  it('checker vs dots differ in size as well as density: 4 px blocks against 2 px dots', () => {
    expect(longestRun(greyMask('red'))).toBe(4);
    expect(longestRun(greyMask('green'))).toBe(2);
  });

  it('every pair of bands differs on at least 35 percent of the cell at 1x and 30 percent at half scale', () => {
    for (let a = 0; a < COLORED.length; a++) {
      for (let b = a + 1; b < COLORED.length; b++) {
        const ma = greyMask(COLORED[a] as BandColor);
        const mb = greyMask(COLORED[b] as BandColor);
        expect(hamming(ma, mb), `${COLORED[a]} vs ${COLORED[b]}`).toBeGreaterThanOrEqual(0.35);
        expect(meanAbsDiff(halfScale(ma), halfScale(mb)), `${COLORED[a]} vs ${COLORED[b]} half scale`).toBeGreaterThanOrEqual(0.3);
      }
    }
  });

  it('the whole red and green tiles are also different greys (green is more than twice as bright against the background)', () => {
    const bg = hexToRgb(palette.background);
    const red = contrastRatio(hexToRgb(palette.gears.red.solid.fill), bg);
    const green = contrastRatio(hexToRgb(palette.gears.green.solid.fill), bg);
    expect(green / red).toBeGreaterThan(2);
  });
});

describe('16 px ghost tiles', () => {
  it('ghost checker vs ghost dots differ on at least 40 percent of the cell, at 1x and half scale', () => {
    const red = ghostMask('red');
    const green = ghostMask('green');
    expect(hamming(red, green)).toBeGreaterThanOrEqual(0.4);
    expect(meanAbsDiff(halfScale(red), halfScale(green))).toBeGreaterThanOrEqual(0.4);
  });

  it('every pair of ghost tiles differs on at least 35 percent of the cell', () => {
    for (let a = 0; a < COLORED.length; a++) {
      for (let b = a + 1; b < COLORED.length; b++) {
        expect(hamming(ghostMask(COLORED[a] as BandColor), ghostMask(COLORED[b] as BandColor)), `${COLORED[a]} vs ${COLORED[b]}`).toBeGreaterThanOrEqual(0.35);
      }
    }
  });
});
