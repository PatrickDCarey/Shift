import Phaser from 'phaser';
import { SCENE_KEYS } from './keys';

/** Loads shared assets, then hands off. Placeholder until assets exist. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    this.scene.start(SCENE_KEYS.game);
  }
}
