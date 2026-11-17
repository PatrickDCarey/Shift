/**
 * Draws the "why you fell" rings: one `fx/why/<band>/<step>` image per ringed tile,
 * at the tile's top-left, above the tiles and hints and below both bodies, tinted
 * `ui.text`. A pool of images, so nothing is allocated per frame.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { hexToNumber, palette, PIXEL_KEYS } from '../fx';
import type { WhyDraw } from './whyFell';

/** Tiles 0, exit 1, hints 5 and 6; bodies 9 and 10. */
const DEPTH_WHY = 7;

export class WhyFellView {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly ink = hexToNumber(palette.ui.text);

  constructor(private readonly scene: Phaser.Scene) {}

  /** Show exactly `rings` (an empty list hides all). */
  update(rings: readonly WhyDraw[]): void {
    rings.forEach((r, i) => this.image(i).setFrame(r.frame).setPosition(r.x, r.y).setVisible(true));
    for (let i = rings.length; i < this.pool.length; i++) this.pool[i]?.setVisible(false);
  }

  destroy(): void {
    for (const img of this.pool) img.destroy();
    this.pool.length = 0;
  }

  private image(i: number): Phaser.GameObjects.Image {
    const existing = this.pool[i];
    if (existing !== undefined) return existing;
    const img = this.scene.add
      .image(0, 0, PIXEL_KEYS.fx, 'fx/why/blue/hold')
      .setOrigin(0, 0)
      .setTint(this.ink)
      .setDepth(DEPTH_WHY)
      .setVisible(false);
    this.pool.push(img);
    return img;
  }
}
