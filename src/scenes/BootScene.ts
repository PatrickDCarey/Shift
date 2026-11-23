import Phaser from 'phaser';
import { PIXEL_KEYS, palette } from '../fx';
import {
  BOOT_ERROR_ELEMENT_ID,
  BOOT_FAILURE_MESSAGE,
  BOOT_LOAD_ATTEMPTS,
  BOOT_LOAD_PLAN,
  LOADER_REQUEST_RETRIES,
  captureLoaderErrors,
  nextBootStep,
  runBootSideJob,
  type BootStep,
  type LoaderErrorCapture,
} from './bootLoad';
import { applyAudioSettings } from '../ui/audioSettings';
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
import kineticsPng from '../../assets/art/pixel/pixel-kinetics.png?url';
import kineticsAtlas from '../../assets/art/pixel/pixel-kinetics.json';
import tilesetPng from '../../assets/art/pixel/pixel-tileset.png?url';
import fontPng from '../../assets/art/pixel/pixel-font.png?url';
import fontXml from '../../assets/art/pixel/pixel-font.xml?url';

/** One boot asset: how to queue it, and how to tell it reached the caches. */
interface BootAsset {
  readonly key: string;
  readonly queue: (load: Phaser.Loader.LoaderPlugin) => void;
  readonly isLoaded: (scene: Phaser.Scene) => boolean;
}

/** The six JSON-hash atlases (`load.atlas`, pivots read from each frame). */
const ATLASES: ReadonlyArray<{ readonly key: string; readonly png: string; readonly data: object }> = [
  { key: PIXEL_KEYS.player, png: playerPng, data: playerAtlas },
  { key: PIXEL_KEYS.tiles, png: tilesPng, data: tilesAtlas },
  { key: PIXEL_KEYS.scenery, png: sceneryPng, data: sceneryAtlas },
  { key: PIXEL_KEYS.hud, png: hudPng, data: hudAtlas },
  { key: PIXEL_KEYS.fx, png: fxPng, data: fxAtlas },
  { key: PIXEL_KEYS.kinetics, png: kineticsPng, data: kineticsAtlas },
];

const BOOT_ASSETS: readonly BootAsset[] = [
  ...ATLASES.map(({ key, png, data }) => ({
    key,
    queue: (load: Phaser.Loader.LoaderPlugin) => load.atlas(key, png, data),
    isLoaded: (scene: Phaser.Scene) => scene.textures.exists(key),
  })),
  // A 16 x 10 grid of 16 px tiles for Tilemap layers (`tilemap.addTilesetImage`).
  {
    key: PIXEL_KEYS.tileset,
    queue: (load) => load.image(PIXEL_KEYS.tileset, tilesetPng),
    isLoaded: (scene) => scene.textures.exists(PIXEL_KEYS.tileset),
  },
  {
    key: PIXEL_KEYS.font,
    queue: (load) => load.bitmapFont(PIXEL_KEYS.font, fontPng, fontXml),
    isLoaded: (scene) => scene.cache.bitmapFont.exists(PIXEL_KEYS.font) && scene.textures.exists(PIXEL_KEYS.font),
  },
];

/**
 * Loads every `PIXEL_KEYS` texture and the bitmap font, then hands off
 * (ADR `adr-pixel-rendering.md`, PX-4). Later scenes find them in the global
 * texture and bitmap-font caches under the `PIXEL_KEYS` names.
 *
 * BUG-6 (B7-03): after the load, Boot checks the caches (Phaser does not report
 * a file that downloaded but failed to decode; see `bootLoad.ts`). Anything
 * missing is queued again per `BOOT_LOAD_PLAN` (after a short wait, loading
 * images through `<img src>` instead of XHR + blob); if it is still missing
 * after the last attempt, Boot shows `BOOT_FAILURE_MESSAGE` in a DOM element
 * and starts no other scene, instead of a black canvas and a texture error in
 * the next scene.
 */
export class BootScene extends Phaser.Scene {
  private attempt = 0;
  private retried: readonly string[] = [];
  private capture: LoaderErrorCapture | null = null;

  constructor() {
    super(SCENE_KEYS.boot);
  }

  preload(): void {
    this.attempt = 0;
    this.retried = [];
    this.capture = captureLoaderErrors(console);
    // Boot is stopped (SHUTDOWN) when it hands off, never destroyed; release on both.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseCapture());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.releaseCapture());
    this.load.maxRetries = LOADER_REQUEST_RETRIES;
    this.load.imageLoadType = BOOT_LOAD_PLAN[0]?.imageLoadType ?? 'XHR';
    for (const asset of BOOT_ASSETS) asset.queue(this.load);
  }

  create(): void {
    // Fail at boot, not at the first level complete, if main.ts did not share the store.
    const store = getSaveStore(this.registry);
    // Saved mute must reach the engine before any gesture (settings.md check 1, after a reload).
    // Guarded: it must never stop Boot before the load check and the BUG-6 message (B7-13).
    runBootSideJob('applying the saved audio settings', () => applyAudioSettings(store.getSettings()));
    this.afterLoad();
  }

  /** Runs after each load attempt: start the game, retry what is missing, or give up. */
  private afterLoad(): void {
    this.attempt += 1;
    const missing = BOOT_ASSETS.filter((asset) => !asset.isLoaded(this)).map((asset) => asset.key);
    const step = nextBootStep(this.attempt, missing);
    if (step.kind === 'retry') {
      this.retry(step);
      return;
    }
    const held = this.releaseCapture();
    if (step.kind === 'fail') {
      for (const args of held) console.error(...args);
      console.error('Boot: %s still missing after %d load attempts', step.keys.join(', '), BOOT_LOAD_ATTEMPTS);
      showLoadFailure();
      return;
    }
    if (this.retried.length > 0) {
      console.warn('Boot: %s failed to load the first time and loaded on attempt %d', this.retried.join(', '), this.attempt);
    }
    // The title on a normal load; `?level=` / `?replay=1` still open the game directly.
    this.scene.start(bootTarget(window.location.search));
  }

  /** Queues the missing keys again after the step's wait, over the step's image path. */
  private retry(step: Extract<BootStep, { kind: 'retry' }>): void {
    // Name what failed the first time; a later retry only narrows it.
    if (this.retried.length === 0) this.retried = step.keys;
    this.time.delayedCall(step.delayMs, () => {
      // Read by each ImageFile when it is created (atlas, image and bitmap-font images alike).
      this.load.imageLoadType = step.imageLoadType;
      for (const asset of BOOT_ASSETS) if (step.keys.includes(asset.key)) asset.queue(this.load);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.afterLoad());
      this.load.start();
    });
  }

  /** Restores `console.error` and returns the loader errors it held back. */
  private releaseCapture(): ReadonlyArray<readonly unknown[]> {
    const held = this.capture?.captured ?? [];
    this.capture?.release();
    this.capture = null;
    return held;
  }
}

/**
 * The double-failure screen: a DOM element over the canvas, not canvas text,
 * because the bitmap font may be what failed and because the page (and
 * Playwright) can read it without the QA hook. System font, palette colours.
 */
function showLoadFailure(): void {
  if (document.getElementById(BOOT_ERROR_ELEMENT_ID) !== null) return;
  const message = document.createElement('p');
  message.id = BOOT_ERROR_ELEMENT_ID;
  message.setAttribute('role', 'alert');
  message.textContent = BOOT_FAILURE_MESSAGE;
  Object.assign(message.style, {
    position: 'fixed',
    inset: '0',
    margin: '0',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    font: '16px monospace',
    letterSpacing: '0.1em',
    background: palette.background,
    color: palette.ui.text,
    zIndex: '1',
  });
  document.body.appendChild(message);
}
