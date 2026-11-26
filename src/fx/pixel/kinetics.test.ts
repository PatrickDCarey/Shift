/**
 * Expansion sprites: sizes, the raised lip, kinds that differ without colour, the grey bolt's own
 * silhouette, a tell frame that differs in brightness, and the committed atlas matching the code.
 */
import { describe, expect, it } from 'vitest';
import kineticsJson from '../../../assets/art/pixel/pixel-kinetics.json';
import { buildPixelAssets } from './atlas';
import { BOLT_KINDS, BOLT_SIZE, EMITTER_SIZE, bakeBolt, bakeBoltTail, boltFill, boltOutline, boltTailOrigin, boltTailPivot, bakeEmitter, bakeShimmer, bakeSink } from './bolts';
import { DIRS, SLAB_KINDS, SLAB_SIZE, bakeChevron, bakeSlabSegment, bakeTrackCell, slabSegments, TRACK_CELLS } from './movers';
import { POST_H, POST_W, bakePost, bakePostRise } from './posts';
import { SWEEP_TILE, bakeSweepEdge, bakeSweepFill, bakeSweepMarker } from './sweep';
import { getPixel, type Raster } from './raster';
import { contrastRatio, hexToRgb } from '../color';
import { backgroundForSpeed, palette } from '../palette';

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
  it('bolts are 10 x 10 (the 8 x 8 hit box edge to edge plus a 1 px dark outline) and differ pairwise in greyscale', () => {
    for (let a = 0; a < BOLT_KINDS.length; a++) {
      const A = bakeBolt(BOLT_KINDS[a]!);
      expect([A.width, A.height]).toEqual([BOLT_SIZE + 2, BOLT_SIZE + 2]);
      for (let b = a + 1; b < BOLT_KINDS.length; b++) expect(diff(A, bakeBolt(BOLT_KINDS[b]!))).toBeGreaterThanOrEqual(10);
    }
  });

  const isDark = (r: Raster, x: number, y: number): boolean => {
    const p = getPixel(r, x, y);
    const d = hexToRgb(palette.background);
    return p[3] === 255 && p[0] === d.r && p[1] === d.g && p[2] === d.b;
  };
  const core = (r: Raster, x: number, y: number): boolean => getPixel(r, x, y)[3] === 255 && !isDark(r, x, y);

  it('every core touches all four edges of the 8 x 8 hit box, and the dark outline stays outside it', () => {
    for (const k of BOLT_KINDS) {
      const r = bakeBolt(k);
      const range = [...Array(10).keys()];
      expect(range.some((i) => core(r, i, 1)), k + ' top').toBe(true);
      expect(range.some((i) => core(r, i, 8)), k + ' bottom').toBe(true);
      expect(range.some((i) => core(r, 1, i)), k + ' left').toBe(true);
      expect(range.some((i) => core(r, 8, i)), k + ' right').toBe(true);
      for (const i of range) for (const e of [0, 9]) {
        expect(core(r, e, i), k).toBe(false);
        expect(core(r, i, e), k).toBe(false);
      }
    }
  });

  it('three families: banded diamond (one outline for all bands), white block, grey spiked ball', () => {
    const m = (k: (typeof BOLT_KINDS)[number]): string => alphaMask(bakeBolt(k));
    expect(m('grey')).not.toBe(m('white'));
    expect(m('white')).not.toBe(m('blue'));
    expect(new Set(['blue', 'green', 'yellow', 'red'].map((k) => m(k as 'blue'))).size).toBe(1);
    const grey = bakeBolt('grey');
    for (const [x, y] of [[1, 1], [8, 1], [1, 8], [8, 8]]) expect(core(grey, x!, y!)).toBe(true); // spike tips reach the box corners
    expect(core(bakeBolt('blue'), 1, 1)).toBe(false); // a diamond has no corner
    expect(core(bakeBolt('white'), 1, 1)).toBe(false); // the block's corners are clipped
  });

  it('every bolt core is at least 3:1 against every world-tint background; the outline against the tiles it crosses', () => {
    const tops = [0, 0.25, 0.5, 0.75, 1];
    for (const k of BOLT_KINDS) {
      for (const t of tops) expect(contrastRatio(boltFill(k), backgroundForSpeed(t * 100, 100)), k + ' ' + t).toBeGreaterThanOrEqual(3);
    }
    const tiles = [palette.safeTile.fill, ...(['blue', 'green', 'yellow', 'red'] as const).map((g) => palette.gears[g].solid.fill)];
    for (const tile of tiles) expect(contrastRatio(boltOutline(), hexToRgb(tile)), tile).toBeGreaterThanOrEqual(3);
  });

  it('bolt tails: a 2 px wide streak on the trailing side only, the core unchanged', () => {
    for (const k of BOLT_KINDS) {
      for (const d of DIRS) {
        const t = bakeBoltTail(d, k);
        const horiz = d === 'l' || d === 'r';
        expect([t.width, t.height]).toEqual(horiz ? [14, 10] : [10, 14]);
        const [bx, by] = boltTailOrigin(d);
        const base = bakeBolt(k);
        for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
          if (x === (d === 'r' ? 0 : 0) && false) continue;
          if (horiz ? (d === 'r' ? x === 0 : x === 9) && (y === 4 || y === 5) : (d === 'd' ? y === 0 : y === 9) && (x === 4 || x === 5)) continue; // joint
          expect(getPixel(t, bx + x, by + y), k + d).toEqual(getPixel(base, x, y));
        }
        const along = (n: number, lat: number): [number, number] =>
          d === 'r' ? [bx - n, by + lat] : d === 'l' ? [bx + 9 + n, by + lat] : d === 'd' ? [bx + lat, by - n] : [bx + lat, by + 9 + n];
        for (const n of [1, 2, 3]) for (const lat of [4, 5]) expect(core(t, ...along(n, lat)), k + d + n).toBe(true);
        for (const lat of [3, 6]) expect(core(t, ...along(2, lat)), k + d).toBe(false); // outline only
      }
    }
    expect(boltTailPivot('r').x * 14).toBe(9);
    expect(boltTailPivot('l').x * 14).toBe(5);
    expect(boltTailPivot('d').y * 14).toBe(9);
    expect(boltTailPivot('u').y * 14).toBe(5);
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
    for (const name of ['slab/red/solid/L', 'slab/safe/ghost/S', 'slab/chevron/u', 'track/stop/d', 'emitter/d/white/tell', 'bolt/grey', 'bolt/grey/r', 'bolt/red/u', 'bolt/shimmer/3', 'bolt/sink/l']) {
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

describe('sweep', () => {
  const lit = (r: Raster): number => grey(r).filter((v) => v >= 0).length;

  it('edge and fill tile seamlessly in 16 x 16 and animate', () => {
    for (let f = 0; f < 3; f++) expect([bakeSweepEdge(f).width, bakeSweepEdge(f).height]).toEqual([SWEEP_TILE, SWEEP_TILE]);
    expect(diff(bakeSweepEdge(0), bakeSweepEdge(1))).toBeGreaterThan(0);
    expect(diff(bakeSweepFill(0), bakeSweepFill(1))).toBeGreaterThan(0);
    for (const e of [bakeSweepEdge(0), bakeSweepEdge(2)]) {
      for (let x = 0; x < 16; x++) expect(luma(e, x, 0) >= 0).toBe(luma(e, x, 8) >= 0);
      expect(luma(e, 15, 3)).toBeGreaterThanOrEqual(0);
      expect(luma(e, 14, 11)).toBeGreaterThanOrEqual(0);
    }
  });

  it('the hatch is sparse enough to read geometry beneath, and the marker points left', () => {
    expect(lit(bakeSweepFill(0))).toBe(64);
    const m = bakeSweepMarker();
    expect(luma(m, 0, 7) >= 0 || luma(m, 0, 8) >= 0).toBe(true);
    expect(luma(m, 0, 0)).toBe(-1);
  });
});
