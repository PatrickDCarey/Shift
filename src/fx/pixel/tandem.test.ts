/**
 * Art for Tandem (T-05): the runner and the twin are told apart by shape in greyscale and under
 * the three colour-vision simulations, both always show their band's pattern (also when parked),
 * the HUD silhouettes and the edge arrow reuse the same shapes, and the home pose and glyph read.
 * Numbers are written up in docs/art/accessibility.md section 10.
 */
import { describe, expect, it } from 'vitest';
import type { BandColor } from '../../core/types';
import { VISIONS, contrastRatio, hexToRgb, simulateVision, type Rgb, type Vision } from '../color';
import { backgroundForSpeed, palette, patternOf } from '../palette';
import { EDGE_ARROW_H, EDGE_ARROW_W, GLYPH_BODY_H, GLYPH_BODY_W, bakeBodyGlyph, bakeEdgeArrow, bakeHomeGlyph } from './hud';
import { BANDS, PLAYER_FRAMES, bakePlayerFrame, roleColors } from './player';
import { FRAME_W, ROLE, VARIANTS, buildBody } from './playerBody';
import { getPixel, type Raster } from './raster';

const MARKED: readonly BandColor[] = ['blue', 'green', 'yellow', 'red'];
const SIMS = VISIONS.filter((v) => v !== 'normal');
const FIELD = backgroundForSpeed(0, 12);
const rgbOf = (p: readonly number[]): Rgb => ({ r: p[0] ?? 0, g: p[1] ?? 0, b: p[2] ?? 0 });

/** Pixels of a baked frame that stand out from the field (>= 3:1) after the simulation. */
function visibleMask(frame: Raster, vision: Vision): boolean[] {
  const bg = simulateVision(FIELD, vision);
  const out: boolean[] = [];
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const p = getPixel(frame, x, y);
      out.push(p[3] > 0 && contrastRatio(simulateVision(rgbOf(p), vision), bg) >= 3);
    }
  }
  return out;
}

const frameOf = (name: string) => {
  const def = PLAYER_FRAMES.find((f) => f.name === name);
  if (!def) throw new Error(`no frame ${name}`);
  return def;
};

describe('runner vs twin by shape, in every vision', () => {
  const poses = PLAYER_FRAMES.filter((f) => !f.name.startsWith('death') && !f.name.startsWith('shift'));

  it.each(SIMS)('%s: the visible silhouettes differ on at least 10 pixels in every pose and band', (vision) => {
    for (const band of BANDS) {
      for (const def of poses) {
        const a = visibleMask(bakePlayerFrame('runner', band, def), vision);
        const b = visibleMask(bakePlayerFrame('twin', band, def), vision);
        const diff = a.filter((v, i) => v !== b[i]).length;
        expect(diff, `${vision} ${band} ${def.name}`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('the twin head is a narrow antenna and the runner head a wide flat top, visible in greyscale at 1x', () => {
    for (const band of BANDS) {
      const rows = (name: 'runner' | 'twin'): number[] => {
        const m = visibleMask(bakePlayerFrame(name, band, frameOf('idle_0')), 'gray');
        const first = Math.floor(m.indexOf(true) / FRAME_W);
        return [m.slice(first * FRAME_W, (first + 1) * FRAME_W).filter(Boolean).length, m.slice((first + 1) * FRAME_W, (first + 2) * FRAME_W).filter(Boolean).length];
      };
      expect(rows('twin')[0], band).toBeLessThanOrEqual(2);
      expect(rows('runner')[0], band).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('band pattern is on every body in every vision', () => {
  it.each(SIMS)('%s: pattern ink against fill is at least 3:1 for every marked band', (vision) => {
    for (const band of MARKED) {
      const c = roleColors(band, 'normal');
      const ink = simulateVision(rgbOf(c[ROLE.ink]), vision);
      const fill = simulateVision(rgbOf(c[ROLE.fill]), vision);
      expect(contrastRatio(ink, fill), `${vision} ${band}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every pose of both bodies, parked included, has at least 8 pattern pixels in each marked band', () => {
    for (const variant of VARIANTS) {
      for (const band of MARKED) {
        for (const def of PLAYER_FRAMES) {
          if (def.mode !== 'normal') continue;
          const g = def.build(variant, patternOf(band));
          expect(g.cells.filter((c) => c === ROLE.ink).length, `${variant} ${band} ${def.name}`).toBeGreaterThanOrEqual(8);
        }
      }
    }
  });
});

describe('home (parked) pose', () => {
  it('is one frame that differs from standing on at least 15 pixels, for both bodies', () => {
    for (const variant of VARIANTS) {
      const a = buildBody(variant, 'plain', {});
      const park = frameOf('park_0').build(variant, 'plain');
      expect(park.cells.filter((c, i) => c !== a.cells[i]).length).toBeGreaterThanOrEqual(15);
    }
  });

  it('carries a house mark in the HUD text colour above the head, clear of the body', () => {
    for (const variant of VARIANTS) {
      const g = frameOf('park_0').build(variant, 'plain');
      const marks = Array.from(g.cells, (c, i) => (c === ROLE.mark ? i : -1)).filter((i) => i >= 0);
      expect(marks.length).toBeGreaterThanOrEqual(10);
      const lowestMark = Math.max(...marks.map((i) => Math.floor(i / FRAME_W)));
      const firstBody = g.cells.findIndex((c) => c !== ROLE.none && c !== ROLE.key && c !== ROLE.mark);
      expect(lowestMark).toBeLessThan(Math.floor(firstBody / FRAME_W));
    }
    expect(contrastRatio(hexToRgb(palette.ui.text), FIELD)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the feet on the baseline like every other frame', () => {
    for (const variant of VARIANTS) {
      const baked = bakePlayerFrame(variant, 'red', frameOf('park_0'));
      let lowest = 0;
      for (let y = 0; y < baked.height; y++) for (let x = 0; x < baked.width; x++) if (getPixel(baked, x, y)[3] > 0) lowest = y;
      expect(lowest).toBe(26);
    }
  });
});

describe('HUD silhouette glyphs and the edge arrow', () => {
  const count = (r: Raster): number => r.data.filter((_, i) => i % 4 === 3 && (r.data[i] ?? 0) > 0).length;
  const mask = (r: Raster): boolean[] => Array.from({ length: r.width * r.height }, (_, i) => (r.data[i * 4 + 3] ?? 0) > 0);

  it('are 7 x 12 white masks that differ by at least 10 pixels', () => {
    const [runner, twin] = [bakeBodyGlyph('runner'), bakeBodyGlyph('twin')];
    for (const g of [runner, twin]) expect([g.width, g.height]).toEqual([GLYPH_BODY_W, GLYPH_BODY_H]);
    const a = mask(runner);
    const b = mask(twin);
    expect(a.filter((v, i) => v !== b[i]).length).toBeGreaterThanOrEqual(10);
    expect(Array.from(runner.data).filter((_, i) => i % 4 !== 3 && (runner.data[i - (i % 4) + 3] ?? 0) > 0).every((v) => v === 255)).toBe(true);
  });

  it('echo the sprites: the twin glyph has the antenna rows, the runner glyph a visor gap', () => {
    const twin = mask(bakeBodyGlyph('twin'));
    const runner = mask(bakeBodyGlyph('runner'));
    expect(twin.slice(0, GLYPH_BODY_W).filter(Boolean)).toHaveLength(1);
    expect(runner.slice(0, GLYPH_BODY_W).filter(Boolean).length).toBeGreaterThanOrEqual(5);
  });

  it('the home glyph is a 7 x 7 mask with ink', () => {
    const home = bakeHomeGlyph();
    expect([home.width, home.height]).toEqual([7, 7]);
    expect(count(home)).toBeGreaterThan(20);
  });

  it('the edge arrow points right: widest on the middle rows, a closed outline in the HUD text colour', () => {
    for (const body of VARIANTS) {
      const arrow = bakeEdgeArrow(body, 'blue');
      expect([arrow.width, arrow.height]).toEqual([EDGE_ARROW_W, EDGE_ARROW_H]);
      const rowWidth = (y: number): number => Array.from({ length: arrow.width }, (_, x) => getPixel(arrow, x, y)[3] > 0).lastIndexOf(true) + 1;
      expect(rowWidth(7)).toBe(EDGE_ARROW_W);
      expect(rowWidth(0)).toBeLessThan(rowWidth(7));
      expect(getPixel(arrow, EDGE_ARROW_W - 1, 7).slice(0, 3)).toEqual(Object.values(hexToRgb(palette.ui.text)).map(Math.round));
    }
  });

  it.each(VISIONS)('%s: the glyph colour of every band is at least 3:1 against the panel, and the outline at least 4.5:1 against the field', (vision) => {
    const panel = simulateVision(hexToRgb(palette.ui.panel), vision);
    for (const band of BANDS) expect(contrastRatio(simulateVision(hexToRgb(palette.gears[band].solid.fill), vision), panel), `${vision} ${band}`).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(simulateVision(hexToRgb(palette.ui.text), vision), simulateVision(FIELD, vision))).toBeGreaterThanOrEqual(4.5);
  });

  it('the silhouettes inside the arrow differ between the two bodies in every band', () => {
    for (const band of BANDS) {
      const a = mask(bakeEdgeArrow('runner', band));
      const b = mask(bakeEdgeArrow('twin', band));
      expect(a).toEqual(b); // the outline is the same; the shape inside is what differs
      const pa = Array.from(bakeEdgeArrow('runner', band).data);
      const pb = Array.from(bakeEdgeArrow('twin', band).data);
      expect(pa.filter((v, i) => v !== pb[i]).length).toBeGreaterThanOrEqual(10);
    }
  });
});
