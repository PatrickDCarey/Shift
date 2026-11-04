/**
 * Sprite-sheet packer and the whole pixel asset set. Produces Phaser
 * "JSON hash" atlases (frames + meta) with a per-frame content hash so a test
 * can prove the committed PNGs match this code. Pure; no Phaser. Owner: art-director.
 */
import { BANDS, PLAYER_ANIMS, PLAYER_FRAMES, bakePlayerFrame, type AnimMeta } from './player';
import { FEET_Y, FRAME_H, FRAME_W, VARIANTS } from './playerBody';
import { EDGE_ARROW_H, EDGE_ARROW_W, GLYPH_BODY_H, GLYPH_BODY_W, GLYPH_HOME_SIZE, bakeBodyGlyph, bakeEdgeArrow, bakeHomeGlyph } from './hud';
import { blit, createRaster, hashRaster, type Raster } from './raster';
import { RIDGES, bakeHorizon, bakeRidge, bakeStars } from './scenery';
import { COLORED_BANDS, TILESET_COLUMNS, TILESET_COUNT, TILESET_ROWS, bakeTileset, tilesetIndex } from './tileset';
import {
  EXIT_FRAMES,
  NEIGHBOUR_MASKS,
  SAFE_DEPTHS,
  bakeExitDoor,
  bakeExitGlow,
  bakeGhostTile,
  bakeSafeTile,
  bakeSolidTile,
  neighboursOf,
} from './tiles';

export interface PackItem {
  readonly name: string;
  readonly raster: Raster;
  /** Normalised origin; Phaser uses it as the frame's default origin. */
  readonly pivot?: { readonly x: number; readonly y: number };
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface AtlasFrame {
  readonly frame: Rect;
  readonly rotated: false;
  readonly trimmed: false;
  readonly spriteSourceSize: Rect;
  readonly sourceSize: { readonly w: number; readonly h: number };
  readonly pivot?: { readonly x: number; readonly y: number };
}

export interface AtlasJson {
  readonly frames: Record<string, AtlasFrame>;
  readonly meta: {
    readonly app: string;
    readonly version: string;
    readonly image: string;
    readonly format: 'RGBA8888';
    readonly size: { readonly w: number; readonly h: number };
    readonly scale: '1';
  };
  /** Not read by Phaser: content hashes, animation hints, notes. */
  readonly redshift: Record<string, unknown> & { readonly hashes: Record<string, string> };
}

export interface PackedAtlas {
  readonly sheet: Raster;
  readonly json: AtlasJson;
}

const PAD = 1;

/** Shelf-pack items left to right, top to bottom, with a 1 px gutter. */
export function packAtlas(image: string, items: readonly PackItem[], maxWidth: number, extra: Record<string, unknown> = {}): PackedAtlas {
  const placed: Array<{ item: PackItem; x: number; y: number }> = [];
  let x = PAD;
  let y = PAD;
  let rowH = 0;
  let widest = 0;
  for (const item of items) {
    const { width: w, height: h } = item.raster;
    if (x + w + PAD > maxWidth) {
      x = PAD;
      y += rowH + PAD;
      rowH = 0;
    }
    placed.push({ item, x, y });
    x += w + PAD;
    rowH = Math.max(rowH, h);
    widest = Math.max(widest, x);
  }
  const sheet = createRaster(widest, y + rowH + PAD);
  const frames: Record<string, AtlasFrame> = {};
  const hashes: Record<string, string> = {};
  for (const { item, x: px, y: py } of placed) {
    blit(sheet, item.raster, px, py);
    const { width: w, height: h } = item.raster;
    frames[item.name] = {
      frame: { x: px, y: py, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
      ...(item.pivot ? { pivot: item.pivot } : {}),
    };
    hashes[item.name] = hashRaster(item.raster);
  }
  return {
    sheet,
    json: {
      frames,
      meta: { app: 'redshift art-director', version: '1', image, format: 'RGBA8888', size: { w: sheet.width, h: sheet.height }, scale: '1' },
      redshift: { hashes, ...extra },
    },
  };
}

/** Phaser texture / font keys for the committed files in assets/art/pixel/ (`pixel-<key>.png` plus `.json`, or `.xml` for the font). */
export const PIXEL_KEYS = {
  player: 'pixel-player',
  tiles: 'pixel-tiles',
  scenery: 'pixel-scenery',
  hud: 'pixel-hud',
  tileset: 'pixel-tileset',
  font: 'pixel-font',
} as const;

export const PLAYER_PIVOT = { x: 0.5, y: FEET_Y / FRAME_H } as const;

export function playerFrameName(variant: string, band: string, frame: string): string {
  return `player/${variant}/${band}/${frame}`;
}

export function tileFrameNames(): { safe: (mask: number, depth: number) => string; solid: (band: string, mask: number) => string; ghost: (band: string) => string } {
  return {
    safe: (mask, depth) => `tile/safe/m${mask}/d${depth}`,
    solid: (band, mask) => `tile/${band}/solid/m${mask}`,
    ghost: (band) => `tile/${band}/ghost`,
  };
}

function playerItems(): PackItem[] {
  const items: PackItem[] = [];
  for (const variant of VARIANTS) {
    for (const band of BANDS) {
      for (const def of PLAYER_FRAMES) {
        items.push({ name: playerFrameName(variant, band, def.name), raster: bakePlayerFrame(variant, band, def), pivot: PLAYER_PIVOT });
      }
    }
  }
  return items;
}

function tileItems(): PackItem[] {
  const names = tileFrameNames();
  const items: PackItem[] = [];
  for (let mask = 0; mask < NEIGHBOUR_MASKS; mask++) {
    for (let depth = 0; depth < SAFE_DEPTHS; depth++) {
      items.push({ name: names.safe(mask, depth), raster: bakeSafeTile(neighboursOf(mask), depth) });
    }
  }
  for (const band of BANDS.filter((b) => b !== 'white')) {
    for (let mask = 0; mask < NEIGHBOUR_MASKS; mask++) {
      items.push({ name: names.solid(band, mask), raster: bakeSolidTile(band, neighboursOf(mask)) });
    }
    items.push({ name: names.ghost(band), raster: bakeGhostTile(band) });
  }
  for (let f = 0; f < EXIT_FRAMES; f++) {
    items.push({ name: `tile/exit/door_${f}`, raster: bakeExitDoor(f) });
    items.push({ name: `tile/exit/glow_${f}`, raster: bakeExitGlow(f) });
  }
  return items;
}

function sceneryItems(): PackItem[] {
  return [
    { name: 'bg/horizon', raster: bakeHorizon() },
    { name: 'bg/stars', raster: bakeStars() },
    { name: 'bg/ridge_far', raster: bakeRidge('far') },
    { name: 'bg/ridge_near', raster: bakeRidge('near') },
  ];
}

export function hudFrameNames(): { glyph: (body: string) => string; home: string; edge: (body: string, band: string) => string } {
  return { glyph: (body) => `glyph/${body}`, home: 'glyph/home', edge: (body, band) => `hud/edge/${body}/${band}` };
}

function hudItems(): PackItem[] {
  const names = hudFrameNames();
  const items: PackItem[] = [];
  for (const body of VARIANTS) items.push({ name: names.glyph(body), raster: bakeBodyGlyph(body) });
  items.push({ name: names.home, raster: bakeHomeGlyph() });
  for (const body of VARIANTS) {
    for (const band of BANDS) items.push({ name: names.edge(body, band), raster: bakeEdgeArrow(body, band), pivot: { x: 0, y: 0.5 } });
  }
  return items;
}

/** The Tilemap grid sheet: not an atlas (Phaser tilemaps need a uniform grid), so its JSON is documentation plus a content hash. */
export interface PackedTileset {
  readonly sheet: Raster;
  readonly json: {
    readonly tileSize: number;
    readonly columns: number;
    readonly rows: number;
    readonly count: number;
    readonly firstIndex: Record<string, number>;
    readonly hash: string;
  };
}

function packTileset(): PackedTileset {
  const sheet = bakeTileset();
  return {
    sheet,
    json: {
      tileSize: 16,
      columns: TILESET_COLUMNS,
      rows: TILESET_ROWS,
      count: TILESET_COUNT,
      firstIndex: {
        safe: tilesetIndex.safe(0, 0),
        ...Object.fromEntries(COLORED_BANDS.map((b) => [`solid/${b}`, tilesetIndex.solid(b, 0)])),
        ...Object.fromEntries(COLORED_BANDS.map((b) => [`ghost/${b}`, tilesetIndex.ghost(b)])),
        exit: tilesetIndex.exit(0),
      },
      hash: hashRaster(sheet),
    },
  };
}

export interface PixelAssets {
  readonly player: PackedAtlas;
  readonly tiles: PackedAtlas;
  readonly scenery: PackedAtlas;
  readonly hud: PackedAtlas;
  readonly tileset: PackedTileset;
}

/** Bake every pixel asset. File names are `pixel-player`, `pixel-tiles`, `pixel-scenery` (.png / .json). */
export function buildPixelAssets(): PixelAssets {
  const anims: readonly AnimMeta[] = PLAYER_ANIMS;
  return {
    player: packAtlas('pixel-player.png', playerItems(), 1024, {
      frameSize: { w: FRAME_W, h: FRAME_H },
      origin: PLAYER_PIVOT,
      bodies: [...VARIANTS],
      bands: [...BANDS],
      anims,
      naming: 'player/<runner|twin>/<band>/<anim>_<n>',
    }),
    tiles: packAtlas('pixel-tiles.png', tileItems(), 512, {
      tileSize: 16,
      neighbourMask: 'bit0 up, bit1 right, bit2 down, bit3 left: that neighbour is the same kind',
      naming: 'tile/safe/m<mask>/d<depth 0-4>, tile/<band>/solid/m<mask>, tile/<band>/ghost, tile/exit/door_<0-3>, tile/exit/glow_<0-3> (32x32, centred on the door tile)',
    }),
    scenery: packAtlas('pixel-scenery.png', sceneryItems(), 512, {
      note: 'White masks, tint at runtime with sceneryColors(). ridge placement is RIDGES[layer].top in the 480x270 view; ridges repeat every 480 px.',
      ridges: RIDGES,
    }),
    hud: packAtlas('pixel-hud.png', hudItems(), 256, {
      naming: 'glyph/<runner|twin> (7x12 white mask), glyph/home (7x7 white mask), hud/edge/<runner|twin>/<band> (22x16, points right, pivot (0, 0.5); flipX at the left edge)',
      sizes: { body: [GLYPH_BODY_W, GLYPH_BODY_H], home: [GLYPH_HOME_SIZE, GLYPH_HOME_SIZE], edge: [EDGE_ARROW_W, EDGE_ARROW_H] },
    }),
    tileset: packTileset(),
  };
}
