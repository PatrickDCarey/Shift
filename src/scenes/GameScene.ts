import Phaser from 'phaser';
import { SCENE_KEYS } from './keys';

// Grey-box placeholder colour. Owned by gameplay-engineer from here on; real
// colours come from src/data/palette.json once art-director creates it.
const PLACEHOLDER_GREY = 0x808080;

/**
 * Renders the simulation and turns keys into input frames.
 * Scaffold only: gameplay-engineer implements the fixed-step loop described in
 * docs/tech/architecture.md.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width / 4, height / 4, PLACEHOLDER_GREY);
  }
}
