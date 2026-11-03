/**
 * Tiny RGBA raster for the pixel-art bakers. Pure (no Phaser, no DOM): the
 * bakers fill a fresh raster and return it, so the same code serves the build
 * script that writes the PNG sheets and the unit tests. Owner: art-director.
 */
import type { Rgb } from '../color';

export interface Raster {
  readonly width: number;
  readonly height: number;
  /** RGBA, 4 bytes per pixel, row-major. Treat as read-only once a baker returns it. */
  readonly data: Uint8ClampedArray;
}

export type Rgba = readonly [number, number, number, number];

export function createRaster(width: number, height: number): Raster {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function rgba(c: Rgb, a = 255): Rgba {
  return [Math.round(c.r), Math.round(c.g), Math.round(c.b), a];
}

const inside = (r: Raster, x: number, y: number): boolean => x >= 0 && y >= 0 && x < r.width && y < r.height;

/** Set one pixel (ignored when outside). Builders mutate the raster they own. */
export function setPixel(r: Raster, x: number, y: number, c: Rgba): void {
  if (!inside(r, x, y)) return;
  const i = (y * r.width + x) * 4;
  r.data[i] = c[0];
  r.data[i + 1] = c[1];
  r.data[i + 2] = c[2];
  r.data[i + 3] = c[3];
}

export function getPixel(r: Raster, x: number, y: number): Rgba {
  if (!inside(r, x, y)) return [0, 0, 0, 0];
  const i = (y * r.width + x) * 4;
  return [r.data[i] ?? 0, r.data[i + 1] ?? 0, r.data[i + 2] ?? 0, r.data[i + 3] ?? 0];
}

export function fillRect(r: Raster, x: number, y: number, w: number, h: number, c: Rgba): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPixel(r, x + i, y + j, c);
}

/** Draw `src` onto `dst` at (x, y) with source-over alpha blending; transparent source pixels are skipped. */
export function blit(dst: Raster, src: Raster, x: number, y: number): void {
  for (let j = 0; j < src.height; j++) {
    for (let i = 0; i < src.width; i++) {
      const s = getPixel(src, i, j);
      if (s[3] === 0) continue;
      if (s[3] === 255) {
        setPixel(dst, x + i, y + j, s);
        continue;
      }
      const d = getPixel(dst, x + i, y + j);
      const sa = s[3] / 255;
      const da = (d[3] / 255) * (1 - sa);
      const oa = sa + da;
      const ch = (k: 0 | 1 | 2): number => Math.round((s[k] * sa + d[k] * da) / oa);
      setPixel(dst, x + i, y + j, [ch(0), ch(1), ch(2), Math.round(oa * 255)]);
    }
  }
}

/** Integer nearest-neighbour upscale, for previews. */
export function upscale(src: Raster, k: number): Raster {
  const out = createRaster(src.width * k, src.height * k);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) setPixel(out, x, y, getPixel(src, Math.floor(x / k), Math.floor(y / k)));
  }
  return out;
}

/** FNV-1a over the RGBA bytes: a stable fingerprint to detect drift between code and committed sheets. */
export function hashRaster(r: Raster): string {
  let h = 0x811c9dc5;
  const mixByte = (b: number): void => {
    h = Math.imul(h ^ b, 0x01000193) >>> 0;
  };
  for (const v of [r.width & 255, r.width >> 8, r.height & 255, r.height >> 8]) mixByte(v);
  for (let i = 0; i < r.data.length; i++) mixByte(r.data[i] ?? 0);
  return h.toString(16).padStart(8, '0');
}

/** 4x4 ordered-dither threshold in [0, 1) for pixel (x, y). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;
export function bayer(x: number, y: number): number {
  return (BAYER[(x & 3) + ((y & 3) << 2)] ?? 0) / 16;
}
