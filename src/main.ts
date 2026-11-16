import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { setSaveStore } from './scenes/keys';
import { createSaveStore } from './save';

/**
 * Logical canvas size: the pixel-art grid (adr-pixel-rendering.md). The itch.io
 * embed is 960 x 540, which is exactly 2x; fullscreen gets the largest whole
 * multiple that fits, letterboxed in the page background.
 */
const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;

/**
 * The one SaveStore for the page session (M2-40). Never throws: with storage
 * blocked (sandboxed iframe, private mode) it keeps the save in memory.
 * Scenes read it with `getSaveStore(this.registry)` (architecture.md §9).
 */
const saveStore = createSaveStore();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  // Implies antialias off, roundPixels on and crisp CSS on the canvas.
  pixelArt: true,
  roundPixels: true,
  scale: {
    // FIT would allow fractional scales, which break the dither; NONE plus
    // MAX_ZOOM gives the largest integer zoom that fits the parent.
    mode: Phaser.Scale.NONE,
    zoom: Phaser.Scale.MAX_ZOOM,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Phaser clamps the frame delta to one 60 Hz step for the first `panicMax`
  // frames, so a slow machine ran in slow motion for seconds after boot. Our
  // accumulator caps catch-up itself (MAX_STEPS_PER_FRAME); `minFps` still
  // guards tab-resume spikes.
  fps: { panicMax: 0 },
  input: {
    keyboard: true,
    mouse: false,
    touch: false,
    gamepad: false,
  },
  disableContextMenu: true,
  banner: false,
  callbacks: {
    // Runs before any scene boots, so every scene finds the store.
    preBoot: (game) => setSaveStore(game.registry, saveStore),
  },
  scene: [BootScene, GameScene],
};

/**
 * Phaser does not re-zoom on its own in `Scale.NONE` mode. itch.io's fullscreen
 * button resizes the iframe, so a window `resize` covers fullscreen too.
 */
function keepIntegerZoom(game: Phaser.Game): void {
  window.addEventListener('resize', () => {
    // Before boot there is no canvas to resize; Phaser sizes it on boot.
    if (!game.isBooted) return;
    game.scale.getParentBounds();
    game.scale.setMaxZoom();
  });
}

keepIntegerZoom(new Phaser.Game(config));
