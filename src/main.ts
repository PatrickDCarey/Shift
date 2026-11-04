import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { setSaveStore } from './scenes/keys';
import { createSaveStore } from './save';

/** Logical canvas size for the itch.io embed (see CLAUDE.md hard rules). */
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

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
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
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

new Phaser.Game(config);
