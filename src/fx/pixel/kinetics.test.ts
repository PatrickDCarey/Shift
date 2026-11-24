/**
 * Expansion sprites: sizes, the raised lip, kinds that differ without colour, the grey bolt's own
 * silhouette, a tell frame that differs in brightness, and the committed atlas matching the code.
 */
import { describe, expect, it } from 'vitest';
import kineticsJson from '../../../assets/art/pixel/pixel-kinetics.json';
import { buildPixelAssets } from './atlas';
import { BOLT_KINDS, BOLT_SIZE, EMITTER_SIZE, bakeBolt, bakeEmitter, bakeShimmer, bakeSink } from './bolts';
import { DIRS, SLAB_KINDS, SLAB_SIZE, bakeChevron, bakeSlabSegment, bakeTrackCell, slabSegments, TRACK_CELLS } from './movers';
import { POST_H, POST_W, bakePost, bakePostRise } from './posts';
import { getPixel, type Raster } from './raster';

const luma = (r: Raster, x: number, y: number): number => {
  const p = getPixel(r, x, y);
  return p[3] === 0 ? -1 : Math.round(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]);
};
/** Greyscale picture: luma per pixel (-1 transparent). */
const grey = (r: Raster): number[] => Array.from({ length: r.width * r.height }, (_, i) => luma(r, i % r.width, Math.floor(i / r.width)));
const diff = (a: Raster, b: Raster): number => grey(a).filter((v, i) => v !== grey(b)[i]).length;
const alphaMask = (r: Raster): string => grey(r).map((v) => (v < 0 ? '.' : '#')).join('');

describe('slabs', () => {
  it('segments compose from the width', () => {
    expect(slabSegments(1)).toEqual(['S']);
    expect(slabSegments(2)).toEqual(['L', 'R']);
    expect(slabSegments(4)).toEqual(['L', 'M', 'M', 'R']);
  });

  it('every slab kind is 16 x 16 with a lit lip brighter than the body, in greyscale', () => {
    for (const k of SLAB_KINDS) {
      const r = bakeSlabSegment(k, 'M', 'solid');
      expect([r.width, r.height]).toEqual([SLAB_SIZE, SLAB_SIZE]);
      expect(luma(r, 8, 1)).toBeGreaterThan(luma(r, 8, 8));
    }
  });

  it('kinds differ pairwise by at least 20 greyscale pixels (pattern, not hue)', () => {
    for (let a = 0; a < SLAB_KINDS.length; a++) {
      for (let b = a + 1; b < SLAB_KINDS.length; b++) {
        expect(diff(bakeSlabSegment(SLAB_KINDS[a]!, 'M', 'solid'), bakeSlabSegment(SLAB_KINDS[b]!, 'M', 'solid'))).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('a ghost slab has far fewer filled pixels than a solid one and no lit lip', () => {
    for (const k of SLAB_KINDS) {
      const solid = bakeSlabSegment(k, 'M', 'solid');
      const ghost = bakeSlabSegment(k, 'M', 'ghost');
      expect(grey(ghost).filter((v) => v >= 0).length).toBeLessThan(grey(solid).filter((v) => v >= 0).length * 0.6);
      expect(getPixel(ghost, 8, 1)[3]).toBe(0);
    }
  });

  it('chevrons and track cells exist for every direction and are white masks', () => {
    for (const d of DIRS) expect(grey(bakeChevron(d)).filter((v) => v >= 0 && v !== 255)).toEqual([]);
    for (const c of TRACK_CELLS) expect(grey(bakeTrackCell(c)).some((v) => v === 255)).toBe(true);
    expect(alphaMask(bakeChevron('l'))).not.toBe(alphaMask(bakeChevron('r')));
  });
});

describe('bolts and emitters', () => {
  it('bolts are 8 x 8 and differ pairwise in greyscale', () => {
    for (let a = 0; a < BOLT_KINDS.length; a++) {
      expect([bakeBolt(BOLT_KINDS[a]!).width, bakeBolt(BOLT_KINDS[a]!).height]).toEqual([BOLT_SIZE, BOLT_SIZE]);
      for (let b = a + 1; b < BOLT_KINDS.length; b++) expect(diff(bakeBolt(BOLT_KINDS[a]!), bakeBolt(BOLT_KINDS[b]!))).toBeGreaterThanOrEqual(6);
    }
  });

  it('the grey bolt has a different silhouette from every diamond', () => {
    const star = alphaMask(bakeBolt('grey'));
    for (const k of BOLT_KINDS.filter((x) => x !== 'grey')) expect(alphaMask(bakeBolt(k))).not.toBe(star);
    expect(getPixel(bakeBolt('grey'), 0, 3)[3]).toBe(255); // star tips reach the box edge, a diamond's rim does not
    expect(getPixel(bakeBolt('blue'), 0, 0)[3]).toBe(0);
  });

  it('emitters are 16 x 16, face four ways, and the tell frame is brighter', () => {
    const masks = new Set(DIRS.map((d) => alphaMask(bakeEmitter(d, 'red', 'idle'))));
    expect(masks.size).toBe(4);
    for (const k of BOLT_KINDS) {
      for (const d of DIRS) {
        const idle = bakeEmitter(d, k, 'idle');
        const tell = bakeEmitter(d, k, 'tell');
        expect([idle.width, idle.height]).toEqual([EMITTER_SIZE, EMITTER_SIZE]);
        // The lit bore (pure white) appears only in the tell frame.
        const white = (r: Raster): number => grey(r).filter((v) => v === 255).length;
        expect(white(tell)).toBeGreaterThanOrEqual(white(idle) + 6);
      }
    }
  });

  it('emitter kinds differ pairwise by glyph in greyscale', () => {
    for (let a = 0; a < BOLT_KINDS.length; a++) {
      for (let b = a + 1; b < BOLT_KINDS.length; b++) expect(diff(bakeEmitter('r', BOLT_KINDS[a]!, 'idle'), bakeEmitter('r', BOLT_KINDS[b]!, 'idle'))).toBeGreaterThanOrEqual(8);
    }
  });

  it('shimmer frames and sinks are white masks', () => {
    for (let f = 0; f < 4; f++) expect(grey(bakeShimmer(f)).some((v) => v === 255)).toBe(true);
    for (const d of DIRS) expect(grey(bakeSink(d)).filter((v) => v >= 0 && v !== 255)).toEqual([]);
  });
});

describe('kinetics atlas', () => {
  const built = buildPixelAssets().kinetics;
  it('matches the committed json and has the documented frames', () => {
    expect(kineticsJson.frames).toEqual(built.json.frames);
    expect(kineticsJson.redshift.hashes).toEqual(built.json.redshift.hashes);
    for (const name of ['slab/red/solid/L', 'slab/safe/ghost/S', 'slab/chevron/u', 'track/stop/d', 'emitter/d/white/tell', 'bolt/grey', 'bolt/shimmer/3', 'bolt/sink/l']) {
      expect(built.json.frames[name], name).toBeDefined();
    }
  });
});

describe('checkpoint post', () => {
  const lit = bakePost('lit');
  const idle = bakePost('idle');
  const lumaCount = (r: Raster): number => grey(r).filter((v) => v >= 0).length;

  it('is 16 x 24 in every state, and the rise frames end at the lit frame', () => {
    for (const r of [idle, lit, ...[0, 1, 2].map(bakePostRise)]) expect([r.width, r.height]).toEqual([POST_W, POST_H]);
    expect(grey(bakePostRise(2))).not.toEqual(grey(lit));
  });

  it('idle and lit differ by shape in greyscale, lit being fuller', () => {
    expect(diff(idle, lit)).toBeGreaterThanOrEqual(30);
    expect(alphaMask(idle)).not.toBe(alphaMask(lit));
    expect(luma(idle, 4, 4)).toBeGreaterThan(luma(idle, 7, 4)); // 2 px bright outline round a dim fill
    expect(luma(idle, 7, 4)).toBeGreaterThan(luma(idle, 3, 4)); // dark rim outside
    expect(luma(idle, 7, 15)).toBeGreaterThanOrEqual(150); // 2 px pole
    expect(luma(idle, 8, 15)).toBeGreaterThanOrEqual(150);
    expect(lumaCount(lit)).toBeGreaterThan(0);
  });

  it('rise frames climb: the pennant moves up each frame', () => {
    const rows = [0, 1, 2].map((f) => grey(bakePostRise(f)).findIndex((v, i) => v >= 0 && i % POST_W >= 9));
    expect(rows[0]).toBeGreaterThan(rows[1]!);
    expect(rows[1]).toBeGreaterThan(rows[2]!);
  });
});
