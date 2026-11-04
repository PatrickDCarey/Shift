/**
 * Player frames for both Tandem bodies, runner and twin: the pattern is on the body in every
 * frame, a band change is a pure palette swap plus the pattern, the two
 * runners differ in silhouette (not colour), feet sit on the baseline, and the
 * committed sheets match this code.
 */
import { describe, expect, it } from 'vitest';
import type { BandColor } from '../../core/types';
import { patternOf } from '../palette';
import playerJson from '../../../assets/art/pixel/pixel-player.json';
import scenery from '../../../assets/art/pixel/pixel-scenery.json';
import tilesJson from '../../../assets/art/pixel/pixel-tiles.json';
import { buildPixelAssets, playerFrameName } from './atlas';
import { BANDS, PLAYER_ANIMS, PLAYER_FRAMES, bakePlayerFrame, bakeRoles, roleColors } from './player';
import { FEET_Y, FRAME_H, FRAME_W, ROLE, VARIANTS, buildBody, type RoleGrid, type Variant } from './playerBody';
import { committedPngNames } from './pngFixture';
import { getPixel } from './raster';

const MARKED: readonly BandColor[] = ['blue', 'green', 'yellow', 'red'];
const count = (g: RoleGrid, role: number): number => g.cells.filter((c) => c === role).length;
const sil = (g: RoleGrid): boolean[] => Array.from(g.cells, (c) => c !== ROLE.none && c !== ROLE.key);

describe('player frame set', () => {
  it('has idle, run, sprint, jump, fall, land, skid, death and band-shift frames', () => {
    const names = PLAYER_FRAMES.map((f) => f.name);
    for (const a of PLAYER_ANIMS) {
      for (let i = 0; i < a.frames; i++) expect(names, `${a.name}_${i}`).toContain(`${a.name}_${i}`);
    }
    expect(names).toHaveLength(PLAYER_ANIMS.reduce((n, a) => n + a.frames, 0));
    expect(new Set(names).size).toBe(names.length);
  });

  it('bakes 20 x 28 frames and is deterministic', () => {
    const def = PLAYER_FRAMES[0];
    if (!def) throw new Error('no frames');
    const a = bakePlayerFrame('runner', 'yellow', def);
    expect([a.width, a.height]).toEqual([FRAME_W, FRAME_H]);
    expect(bakePlayerFrame('runner', 'yellow', def).data).toEqual(a.data);
  });
});

describe.each(VARIANTS)('%s', (variant: Variant) => {
  it.each(MARKED)('shows the %s pattern on the body in every frame, death included', (band) => {
    for (const def of PLAYER_FRAMES) {
      const g = def.build(variant, patternOf(band));
      expect(count(g, ROLE.ink), `${def.name}`).toBeGreaterThanOrEqual(8);
    }
  });

  it('the white band is plain: no pattern marks in any frame', () => {
    for (const def of PLAYER_FRAMES) expect(count(def.build(variant, 'plain'), ROLE.ink), def.name).toBe(0);
  });

  it('a band change changes only the pattern cells: same silhouette, same roles everywhere else', () => {
    for (const def of PLAYER_FRAMES) {
      const base = def.build(variant, 'stripes');
      for (const band of MARKED) {
        const other = def.build(variant, patternOf(band));
        base.cells.forEach((c, i) => {
          const o = other.cells[i];
          if (c !== o) {
            expect([ROLE.ink, ROLE.fill], `${def.name} ${band} cell ${i}`).toContain(c);
            expect([ROLE.ink, ROLE.fill]).toContain(o);
          }
        });
      }
    }
  });

  it('stays inside the frame, with feet on the baseline while grounded', () => {
    for (const def of PLAYER_FRAMES) {
      const g = def.build(variant, 'stripes');
      let low = -1;
      for (let y = 0; y < FRAME_H; y++) {
        for (let x = 0; x < FRAME_W; x++) {
          const c = g.cells[y * FRAME_W + x];
          if (c !== ROLE.none && c !== ROLE.key) low = Math.max(low, y);
          if (!def.name.startsWith('death') && c !== ROLE.none && c !== ROLE.key) {
            // body pixels keep a free column or row for the keyline
            expect(x, `${def.name} x`).toBeGreaterThan(0);
            expect(x, `${def.name} x`).toBeLessThan(FRAME_W - 1);
            expect(y, `${def.name} y`).toBeGreaterThan(0);
          }
        }
      }
      if (/^(idle|run|sprint|land|skid)_/.test(def.name)) expect(low, def.name).toBe(FEET_Y - 1);
    }
  });
});

describe('the two bodies differ in silhouette, not colour', () => {
  it('every frame of the runner and the twin differs on at least 10 silhouette pixels', () => {
    for (const def of PLAYER_FRAMES) {
      const a = sil(def.build('runner', 'stripes'));
      const b = sil(def.build('twin', 'stripes'));
      const diff = a.filter((v, i) => v !== b[i]).length;
      expect(diff, def.name).toBeGreaterThanOrEqual(10);
    }
  });

  it('standing, the silhouettes differ on at least 5 percent of the body box', () => {
    const a = sil(buildBody('runner', 'plain'));
    const b = sil(buildBody('twin', 'plain'));
    const area = a.filter(Boolean).length;
    expect(a.filter((v, i) => v !== b[i]).length / area).toBeGreaterThanOrEqual(0.05);
  });

  it('the twin has an antenna above the head and the runner does not', () => {
    const top = (g: RoleGrid): number => g.cells.findIndex((c) => c !== ROLE.none && c !== ROLE.key) / FRAME_W;
    expect(Math.floor(top(buildBody('twin', 'plain')))).toBeLessThan(Math.floor(top(buildBody('runner', 'plain'))) + 1);
    const rowOf = (g: RoleGrid, y: number): number => g.cells.slice(y * FRAME_W, (y + 1) * FRAME_W).filter((c) => c !== ROLE.none && c !== ROLE.key).length;
    const topA = Math.floor(top(buildBody('runner', 'plain')));
    const topB = Math.floor(top(buildBody('twin', 'plain')));
    expect(rowOf(buildBody('twin', 'plain'), topB)).toBeLessThanOrEqual(2);
    expect(rowOf(buildBody('runner', 'plain'), topA)).toBeGreaterThanOrEqual(6);
  });
});

describe('palette swap', () => {
  it('maps every role to an opaque colour except none, per band and mode', () => {
    for (const band of BANDS) {
      for (const mode of ['normal', 'flash', 'halo'] as const) {
        const colors = roleColors(band, mode);
        for (const role of Object.values(ROLE)) expect(colors[role][3], `${band} ${mode} ${role}`).toBe(role === ROLE.none ? 0 : 255);
      }
    }
  });

  it('the flashed body is white with the band colour as its pattern', () => {
    const colors = roleColors('red', 'flash');
    expect(colors[ROLE.fill]).toEqual([255, 255, 255, 255]);
    expect(colors[ROLE.ink]).toEqual([0xf5, 0x28, 0x3c, 255]);
  });

  it('standing is white with a dark visor so it still shows on the white body', () => {
    expect(roleColors('white', 'normal')[ROLE.visor]).not.toEqual(roleColors('white', 'normal')[ROLE.fill]);
    const baked = bakeRoles(buildBody('runner', 'plain'), 'white', 'normal');
    expect(getPixel(baked, 0, 0)[3]).toBe(0);
  });
});

describe('committed sheets match the code', () => {
  const built = buildPixelAssets();

  it('player atlas: every frame name, rectangle and content hash', () => {
    expect(playerJson.frames).toEqual(built.player.json.frames);
    expect(playerJson.redshift.hashes).toEqual(built.player.json.redshift.hashes);
    expect(Object.keys(playerJson.frames)).toHaveLength(VARIANTS.length * BANDS.length * PLAYER_FRAMES.length);
    expect(playerJson.frames[playerFrameName('twin', 'red', 'sprint_3') as keyof typeof playerJson.frames]).toBeDefined();
  });

  it('tiles and scenery atlases', () => {
    expect(tilesJson.frames).toEqual(built.tiles.json.frames);
    expect(tilesJson.redshift.hashes).toEqual(built.tiles.json.redshift.hashes);
    expect(scenery.frames).toEqual(built.scenery.json.frames);
    expect(scenery.redshift.hashes).toEqual(built.scenery.json.redshift.hashes);
  });

  it('every PNG sheet is committed', () => {
    expect(committedPngNames()).toEqual(['pixel-font.png', 'pixel-hud.png', 'pixel-player.png', 'pixel-scenery.png', 'pixel-tiles.png', 'pixel-tileset.png']);
  });
});
