/**
 * Draws the player: a box (0.75 x 1.5 tiles) in the colour and pattern of its
 * current BAND (actual speed, not the selected gear), with a facing notch.
 * The body itself (halo, fill, pattern, outline, notch) is `drawGearBody` in src/fx.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { BAND_COLORS, type Band, type Facing } from '../core/types';
import { asTileCanvas, drawGearBody } from '../fx';

const DEPTH_PLAYER = 10;

export class PlayerView {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly width: number;
  private readonly height: number;

  constructor(scene: Phaser.Scene, tileSize: number, widthTiles: number, heightTiles: number) {
    this.gfx = scene.add.graphics().setDepth(DEPTH_PLAYER);
    this.width = Math.round(widthTiles * tileSize);
    this.height = Math.round(heightTiles * tileSize);
  }

  /** `feetX`/`feetY` in pixels: bottom centre of the box. */
  draw(feetX: number, feetY: number, band: Band, facing: Facing): void {
    const left = Math.round(feetX - this.width / 2);
    const top = Math.round(feetY - this.height);
    this.gfx.clear();
    drawGearBody(asTileCanvas(this.gfx), BAND_COLORS[band], left, top, this.width, this.height, { facing });
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
