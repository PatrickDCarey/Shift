/**
 * Effect frames: dust on land, ring burst on a band change, speed lines at red. They are white
 * masks (so a tint is one colour swap), faded by dither only, small enough never to act as a flash,
 * symmetric where they should be, and the committed atlas matches the code.
 */
import { describe, expect, it } from 'vitest';
import fxJson from '../../../assets/art/pixel/pixel-fx.json';
import { buildPixelAssets } from './atlas';
import {
  DUST_FRAMES,
  DUST_H,
  DUST_W,
  RING_FRAMES,
  RING_RADII,
  RING_SIZE,
  SPEED_LENGTHS,
  SPEED_PHASES,
  WIPE_DENSITY,
  WIPE_FRAMES,
  WIPE_H,
  WIPE_W,
  bakeDustFrame,
  bakeRingFrame,
  bakeSpeedLine,
  bakeWipeFrame,
  effectFrameNames,
} from './effects';
import { getPixel, type Raster } from './raster';

const frames = (n: number, bake: (i: number) => Raster): Raster[] => Array.from({ length: n }, (_, i) => bake(i));
const lit = (r: Raster): number => {
  let n = 0;
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (getPixel(r, x, y)[3] > 0) n++;
  return n;
};
const dust = frames(DUST_FRAMES, bakeDustFrame);
const rings = frames(RING_FRAMES, bakeRingFrame);
const speed = SPEED_LENGTHS.flatMap((len) => SPEED_PHASES.map((_, ph) => ({ len, ph, r: bakeSpeedLine(len, ph) })));
const all: Raster[] = [...dust, ...rings, ...speed.map((s) => s.r)];

describe('effect frames are white, opaque, 1-bit masks', () => {
  it('every lit pixel is pure white at full alpha (tint = one colour swap; fades are dither, never alpha)', () => {
    for (const r of all) {
      for (let y = 0; y < r.height; y++) {
        for (let x = 0; x < r.width; x++) {
          const p = getPixel(r, x, y);
          if (p[3] === 0) continue;
          expect(p).toEqual([255, 255, 255, 255]);
        }
      }
    }
  });

  it('is deterministic', () => {
    expect(bakeRingFrame(2).data).toEqual(bakeRingFrame(2).data);
    expect(bakeDustFrame(1).data).toEqual(bakeDustFrame(1).data);
    expect(bakeSpeedLine(20, 1).data).toEqual(bakeSpeedLine(20, 1).data);
  });

  it('clamps out-of-range steps to the first or last frame', () => {
    expect(bakeRingFrame(99).data).toEqual(bakeRingFrame(RING_FRAMES - 1).data);
    expect(bakeDustFrame(-1).data).toEqual(bakeDustFrame(0).data);
  });
});

describe('dust on land', () => {
  it('is 24 x 8 with four frames, each with marks and none empty', () => {
    expect(dust).toHaveLength(4);
    for (const r of dust) {
      expect([r.width, r.height]).toEqual([DUST_W, DUST_H]);
      expect(lit(r)).toBeGreaterThanOrEqual(5);
    }
  });

  it('the undithered frames are mirror-symmetric about the feet (specks fly out both ways)', () => {
    for (const r of dust.slice(0, 2)) {
      for (let y = 0; y < r.height; y++) {
        for (let x = 0; x < r.width; x++) expect(getPixel(r, x, y)[3], `${x},${y}`).toBe(getPixel(r, r.width - 1 - x, y)[3]);
      }
    }
  });

  it('spreads outward frame by frame: the lit span widens, specks are 2 px then 1 px, the puff thins', () => {
    const span = (r: Raster): number => {
      let lo = r.width;
      let hi = -1;
      for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (getPixel(r, x, y)[3] > 0) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
      return hi - lo;
    };
    const spans = dust.map(span);
    for (let i = 1; i < spans.length; i++) expect(spans[i] ?? 0, `frame ${i}`).toBeGreaterThan(spans[i - 1] ?? 0);
    expect(lit(dust[3] as Raster)).toBeLessThanOrEqual(lit(dust[1] as Raster));
  });

  it('stays within a quarter of its frame (a puff, never a flash)', () => {
    for (const r of dust) expect(lit(r) / (r.width * r.height)).toBeLessThan(0.25);
  });
});

describe('ring burst', () => {
  it('is 48 x 48 with four steps, and the ring is centred (symmetric on both axes)', () => {
    expect(rings).toHaveLength(4);
    for (const r of rings) {
      expect([r.width, r.height]).toEqual([RING_SIZE, RING_SIZE]);
      expect(lit(r)).toBeGreaterThan(20);
    }
  });

  it('grows each step: the furthest lit pixel from the centre moves out and stays inside the frame', () => {
    const c = (RING_SIZE - 1) / 2;
    const reach = rings.map((r) => {
      let far = 0;
      for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (getPixel(r, x, y)[3] > 0) far = Math.max(far, Math.hypot(x - c, y - c));
      return far;
    });
    for (let i = 1; i < reach.length; i++) expect(reach[i] ?? 0).toBeGreaterThan(reach[i - 1] ?? 0);
    for (let i = 0; i < reach.length; i++) {
      expect(reach[i] ?? 0).toBeLessThanOrEqual((RING_RADII[i] ?? 0) + 1);
      expect(reach[i] ?? 0).toBeLessThan(RING_SIZE / 2);
    }
  });

  it('thins out: lit density falls per step as dither, and stays a small area (under 15 percent of the frame)', () => {
    const area = rings.map((r) => lit(r) / (r.width * r.height));
    for (const a of area) expect(a).toBeLessThan(0.15);
    // Area grows with radius, but the dither keeps the last step from being the fullest.
    expect(area[3] ?? 0).toBeLessThan(area[1] ?? 0);
  });

  it('is a ring, not a disc: the centre is empty', () => {
    for (const r of rings) {
      for (const [x, y] of [[23, 23], [24, 24], [23, 24], [24, 23]] as const) expect(getPixel(r, x, y)[3]).toBe(0);
    }
  });
});

describe('speed lines', () => {
  it('are 1 px tall, 12, 20 and 32 px long, in two phases', () => {
    expect(speed).toHaveLength(6);
    for (const { len, r } of speed) expect([r.width, r.height]).toEqual([len, 1]);
  });

  it('are always lit at the leading (right) end and sparser at the tail than at the head', () => {
    for (const { len, r } of speed) {
      expect(getPixel(r, len - 1, 0)[3], `${len} lead`).toBe(255);
      const half = Math.floor(len / 2);
      let tail = 0;
      let head = 0;
      for (let x = 0; x < half; x++) tail += getPixel(r, x, 0)[3] > 0 ? 1 : 0;
      for (let x = len - half; x < len; x++) head += getPixel(r, x, 0)[3] > 0 ? 1 : 0;
      expect(head, `${len} head vs tail`).toBeGreaterThan(tail);
    }
  });

  it('the two phases of a length are different dither (two lines side by side do not share holes)', () => {
    for (const len of SPEED_LENGTHS) {
      expect(bakeSpeedLine(len, 0).data).not.toEqual(bakeSpeedLine(len, 1).data);
    }
  });
});

describe('atlas pixel-fx', () => {
  const built = buildPixelAssets().fx;

  it('names every frame and carries pivots at the feet, the centre and the lead end', () => {
    const names = effectFrameNames();
    expect(Object.keys(built.json.frames)).toHaveLength(DUST_FRAMES + RING_FRAMES + SPEED_LENGTHS.length * SPEED_PHASES.length + WIPE_FRAMES);
    expect(built.json.frames[names.dust(0)]?.pivot).toEqual({ x: 0.5, y: 1 });
    expect(built.json.frames[names.ring(3)]?.pivot).toEqual({ x: 0.5, y: 0.5 });
    expect(built.json.frames[names.speed(32, 1)]?.pivot).toEqual({ x: 1, y: 0 });
  });

  it('pivots are on pixel boundaries', () => {
    for (const f of Object.values(built.json.frames)) {
      expect((f.pivot?.x ?? 0) * f.frame.w).toBe(Math.floor((f.pivot?.x ?? 0) * f.frame.w));
      expect((f.pivot?.y ?? 0) * f.frame.h).toBe(Math.floor((f.pivot?.y ?? 0) * f.frame.h));
    }
  });

  it('notes the reduced-motion variants: no ring, no speed lines, dust held on one frame', () => {
    const rm = built.json.redshift.reducedMotion as Record<string, string>;
    expect(rm.ringBurst).toMatch(/^off/);
    expect(rm.speedLines).toBe('off');
    expect(rm.dustLand).toMatch(/land_1/);
  });

  it('the committed JSON matches the code (frames, hashes, notes)', () => {
    expect(fxJson.frames).toEqual(built.json.frames);
    expect(fxJson.redshift.hashes).toEqual(built.json.redshift.hashes);
    expect(fxJson.redshift.reducedMotion).toEqual(built.json.redshift.reducedMotion);
  });
});

describe('screen wipe frames', () => {
  const wipes = frames(WIPE_FRAMES, bakeWipeFrame);

  it('are two full-view white dither masks, the second sparser than the first', () => {
    expect(wipes).toHaveLength(2);
    for (const w of wipes) expect([w.width, w.height]).toEqual([WIPE_W, WIPE_H]);
    expect(lit(wipes[1]!)).toBeLessThan(lit(wipes[0]!));
  });

  it('light about the stated fraction of pixels (a pattern, never a solid fill) and are pure white', () => {
    wipes.forEach((w, i) => {
      const frac = lit(w) / (w.width * w.height);
      expect(frac).toBeGreaterThan((WIPE_DENSITY[i] ?? 0) - 0.02);
      expect(frac).toBeLessThan((WIPE_DENSITY[i] ?? 0) + 0.02);
      expect(frac).toBeLessThanOrEqual(0.5);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const px = getPixel(w, x, y);
          if (px[3] > 0) expect([...px]).toEqual([255, 255, 255, 255]);
        }
      }
    });
  });

  it('the two frames differ in a fifth of the screen, so the flash changes shape without any colour', () => {
    const [a, b] = wipes as [Raster, Raster];
    let changed = 0;
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) if (getPixel(a, x, y)[3] !== getPixel(b, x, y)[3]) changed++;
    expect(changed / (a.width * a.height)).toBeGreaterThan(0.2);
  });

  it('are named fx/wipe/<n> in the atlas with origin (0, 0)', () => {
    const built = buildPixelAssets().fx;
    expect(built.json.frames[effectFrameNames().wipe(1)]?.pivot).toEqual({ x: 0, y: 0 });
  });
});
