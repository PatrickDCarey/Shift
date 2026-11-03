/** Background layers for direction C: seamless parallax, luminance cap, and a visible yellow tint. */
import { describe, expect, it } from 'vitest';
import { deltaE76, relativeLuminance } from '../color';
import { palette } from '../palette';
import { getPixel, hashRaster } from './raster';
import {
  RIDGES,
  VIEW_H,
  VIEW_W,
  bakeHorizon,
  bakeRidge,
  bakeStars,
  brightestDecor,
  ridgeHeight,
  sceneryColors,
} from './scenery';

const speeds = Array.from({ length: 49 }, (_, i) => i / 4);
const cap = palette.tint.maxBackgroundLuminance;

describe('scenery masks', () => {
  it('are 480 x 270 (horizon, stars) and 480 wide (ridges), white where set', () => {
    for (const m of [bakeHorizon(), bakeStars()]) expect([m.width, m.height]).toEqual([VIEW_W, VIEW_H]);
    expect(bakeRidge('far').width).toBe(VIEW_W);
    expect(bakeRidge('far').height).toBe(RIDGES.far.height);
    expect(getPixel(bakeHorizon(), 0, 175)[3]).toBe(255);
  });

  it('ridges tile seamlessly: height repeats every 480 px and stays inside the layer', () => {
    for (const layer of ['far', 'near'] as const) {
      const spec = RIDGES[layer];
      expect(ridgeHeight(spec, VIEW_W)).toBe(ridgeHeight(spec, 0));
      for (let x = 0; x < VIEW_W; x++) {
        const h = ridgeHeight(spec, x) - spec.top;
        expect(h, `${layer} x=${x}`).toBeGreaterThanOrEqual(1);
        expect(h, `${layer} x=${x}`).toBeLessThan(spec.height);
      }
    }
  });

  it('the horizon glow is empty at the top and bottom of the view, so it fades out', () => {
    const m = bakeHorizon();
    const rowCount = (y: number): number => Array.from({ length: VIEW_W }, (_, x) => getPixel(m, x, y)[3]).filter((a) => a > 0).length;
    expect(rowCount(0)).toBe(0);
    expect(rowCount(175)).toBe(VIEW_W);
    expect(rowCount(269)).toBe(0);
  });

  it('are deterministic', () => {
    expect(hashRaster(bakeStars())).toBe(hashRaster(bakeStars()));
    expect(hashRaster(bakeRidge('near'))).toBe(hashRaster(bakeRidge('near')));
  });
});

describe('scenery colours', () => {
  it('keep every flat decor colour at or under the luminance cap at every speed', () => {
    for (const s of speeds) {
      const c = sceneryColors(s, 12);
      for (const col of [c.base, c.hue, c.ridgeFar, c.ridgeNear]) {
        expect(relativeLuminance(col), `speed ${s}`).toBeLessThanOrEqual(cap + 1e-6);
      }
      expect(relativeLuminance(c.star), `star at ${s}`).toBeLessThanOrEqual(0.03);
      expect(relativeLuminance(c.ridgeNear)).toBeLessThanOrEqual(relativeLuminance(c.ridgeFar) + 1e-9);
    }
  });

  it('standing is the palette background; every moving band is a clearly different hue (yellow included)', () => {
    const still = sceneryColors(0, 12);
    for (const [s, minDelta] of [[3, 10], [6, 10], [9, 15], [12, 20]] as const) {
      expect(deltaE76(sceneryColors(s, 12).base, still.base), `speed ${s}`).toBeGreaterThanOrEqual(minDelta);
    }
    expect(deltaE76(sceneryColors(9, 12).hue, still.hue)).toBeGreaterThanOrEqual(15);
  });

  it('the horizon is sparser when standing than when moving', () => {
    expect(sceneryColors(0, 12).horizonAlpha).toBeLessThan(sceneryColors(3, 12).horizonAlpha);
  });

  it('the brightest decor is one of the pace hue or a star', () => {
    expect(relativeLuminance(brightestDecor(9, 12))).toBeLessThanOrEqual(0.03);
  });
});
