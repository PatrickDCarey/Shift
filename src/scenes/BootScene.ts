import Phaser from 'phaser';
import { PIXEL_KEYS } from '../fx';
import { SCENE_KEYS, bootTarget, getSaveStore } from './keys';
// The pixel sheets (art-director, `npm run art:build`; docs/art/style.md "Assets").
// PNG and XML come in as `?url`: Vite copies them to dist/assets with relative
// paths (base './', assetsInlineLimit 0), so they load from the itch.io zip.
// Atlas JSON is imported as data: inlined, typed, no extra request.
import playerPng from '../../assets/art/pixel/pixel-player.png?url';
import playerAtlas from '../../assets/art/pixel/pixel-player.json';
import tilesPng from '../../assets/art/pixel/pixel-tiles.png?url';
import tilesAtlas from '../../assets/art/pixel/pixel-tiles.json';
import sceneryPng from '../../assets/art/pixel/pixel-scenery.png?url';
import sceneryAtlas from '../../assets/art/pixel/pixel-scenery.json';
import hudPng from '../../assets/art/pixel/pixel-hud.png?url';
import hudAtlas from '../../assets/art/pixel/pixel-hud.json';
import fxPng from '../../assets/art/pixel/pixel-fx.png?url';
import fxAtlas from '../../assets/art/pixel/pixel-fx.json';
import tilesetPng from '../../assets/art/pixel/pixel-tileset.png?url';
import fontPng from '../../assets/art/pixel/pixel-font.png?url';
import fontXml from '../../assets/art/pixel/pixel-font.xml?url';

/** The five JSON-hash atlases (`load.atlas`, pivots read from each frame). */
const ATLASES: ReadonlyArray<{ readonly key: string; readonly png: string; readonly data: object }> = [
  { key: PIXEL_KEYS.player, png: playerPng, data: playerAtlas },
  { key: PIXEL_KEYS.tiles, png: tilesPng, data: tilesAtlas },
  { key: PIXEL_KEYS.scenery, png: sceneryPng, data: sceneryAtlas },
  { key: PIXEL_KEYS.hud, png: hudPng, data: hudAtlas },
  { key: PIXEL_KEYS.fx, png: fxPng, data: fxAtlas },
];

/**
 * Loads every `PIXEL_KEYS` texture and the bitmap font, then hands off
 * (ADR `adr-pixel-rendering.md`, PX-4). Later scenes find them in the global
 * texture and bitmap-font caches under the `PIXEL_KEYS` names.
 *
 * A missing file does not stop the boot: Phaser logs the load error and
 * `create` still runs, so the scene shows Phaser's missing-texture box rather
 * than a black page.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  preload(): void {
    for (const atlas of ATLASES) this.load.atlas(atlas.key, atlas.png, atlas.data);
    // A 16 x 10 grid of 16 px tiles for Tilemap layers (`tilemap.addTilesetImage`).
    this.load.image(PIXEL_KEYS.tileset, tilesetPng);
    this.load.bitmapFont(PIXEL_KEYS.font, fontPng, fontXml);
  }

  create(): void {
    // Fail at boot, not at the first level complete, if main.ts did not share the store.
    getSaveStore(this.registry);
    // The title on a normal load; `?level=` / `?replay=1` still open the game directly.
    this.scene.start(bootTarget(window.location.search));
  }
}
