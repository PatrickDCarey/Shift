/**
 * The committed PNG sheets in assets/art/pixel/ are exactly what the code bakes, pixel for
 * pixel (rerun `node assets/art/pixel/build.mjs` after any change under src/fx/pixel or to
 * palette.json), and the Phaser atlas JSON files describe real frames inside their sheets.
 */
import { describe, expect, it } from 'vitest';
import hudJson from '../../../assets/art/pixel/pixel-hud.json';
import tilesetJson from '../../../assets/art/pixel/pixel-tileset.json';
import { buildPixelAssets, type PackedAtlas } from './atlas';
import { readCommittedPng } from './pngFixture';
import { getPixel } from './raster';

const built = buildPixelAssets();
const sheets = [
  ['pixel-player.png', built.player.sheet],
  ['pixel-tiles.png', built.tiles.sheet],
  ['pixel-scenery.png', built.scenery.sheet],
  ['pixel-hud.png', built.hud.sheet],
  ['pixel-tileset.png', built.tileset.sheet],
  ['pixel-fx.png', built.fx.sheet],
] as const;

describe('committed sheets', () => {
  it.each(sheets)('%s matches the baked pixels', async (name, sheet) => {
    const committed = await readCommittedPng(name);
    expect([committed.width, committed.height]).toEqual([sheet.width, sheet.height]);
    // First differing byte (or -1): a plain loop, since deep-equal on ~1M numbers can time out under coverage.
    const length = Math.max(committed.data.length, sheet.data.length);
    let firstDiff = -1;
    for (let i = 0; i < length && firstDiff < 0; i += 1) {
      if (committed.data[i] !== sheet.data[i]) firstDiff = i;
    }
    expect(firstDiff, 'first differing byte (pixel = index / 4)').toBe(-1);
  });

  it('pixel-hud.json and pixel-tileset.json match the code', () => {
    expect(hudJson.frames).toEqual(built.hud.json.frames);
    expect(hudJson.redshift.hashes).toEqual(built.hud.json.redshift.hashes);
    expect(tilesetJson).toEqual(built.tileset.json);
  });
});

describe('atlas frames', () => {
  const atlases: ReadonlyArray<readonly [string, PackedAtlas]> = [
    ['player', built.player],
    ['tiles', built.tiles],
    ['scenery', built.scenery],
    ['hud', built.hud],
    ['fx', built.fx],
  ];

  it.each(atlases)('%s: frames are untrimmed, unrotated, inside the sheet and 1 px apart', (_name, atlas) => {
    const rects = Object.values(atlas.json.frames);
    for (const f of rects) {
      expect(f.rotated).toBe(false);
      expect(f.trimmed).toBe(false);
      expect(f.frame.x + f.frame.w).toBeLessThanOrEqual(atlas.sheet.width);
      expect(f.frame.y + f.frame.h).toBeLessThanOrEqual(atlas.sheet.height);
      expect([f.sourceSize.w, f.sourceSize.h]).toEqual([f.frame.w, f.frame.h]);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]?.frame;
        const b = rects[j]?.frame;
        if (!a || !b) continue;
        const apart = a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('the gutter around every player frame is transparent (no bleed under linear filtering)', () => {
    const sheet = built.player.sheet;
    for (const f of Object.values(built.player.json.frames)) {
      for (let x = f.frame.x - 1; x <= f.frame.x + f.frame.w; x++) {
        expect(getPixel(sheet, x, f.frame.y - 1)[3]).toBe(0);
        expect(getPixel(sheet, x, f.frame.y + f.frame.h)[3]).toBe(0);
      }
    }
  });

  it('player frames have even width and a stored pivot on a pixel boundary', () => {
    for (const f of Object.values(built.player.json.frames)) {
      expect(f.frame.w % 2).toBe(0);
      expect((f.pivot?.x ?? 0) * f.frame.w).toBe(Math.floor((f.pivot?.x ?? 0) * f.frame.w));
      expect((f.pivot?.y ?? 0) * f.frame.h).toBe(Math.floor((f.pivot?.y ?? 0) * f.frame.h));
    }
  });
});
