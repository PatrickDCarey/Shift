import Phaser from 'phaser';
import { SCENE_KEYS, getSaveStore } from './keys';

/** Loads shared assets, then hands off. Placeholder until assets exist. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    // Fail at boot, not at the first level complete, if main.ts did not share the store.
    getSaveStore(this.registry);
    this.scene.start(SCENE_KEYS.game);
  }
}
