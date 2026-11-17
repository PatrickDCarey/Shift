/**
 * An edge arrow from the `pixel-hud` atlas: at an off-screen Tandem body (`hud/edge/<body>/<band>`)
 * or at the exit (`hud/edge/exit`, rotated 90 degrees on the top and bottom edges). The band is carried by the frame's pattern ink
 * (never by colour alone). Screen-fixed, whole pixels. One instance per scene.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { PIXEL_KEYS, hudFrameNames } from '../fx/pixel';
import { spriteX, type EdgeArrow } from './tandemView';

const DEPTH = 205;

export class EdgeArrowView {
  private readonly sprite: Phaser.GameObjects.Image;
  /** The frame on screen right now; null while hidden (exposed for the QA hook). */
  shown: string | null = null;

  constructor(scene: Phaser.Scene, depth = DEPTH) {
    this.sprite = scene.add
      .image(0, 0, PIXEL_KEYS.hud, hudFrameNames().edge('twin', 'white'))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
  }

  /** `arrow` null hides it. `frame` is the atlas frame name to show. */
  update(arrow: EdgeArrow | null, frame: string): void {
    if (arrow === null) {
      this.sprite.setVisible(false);
      this.shown = null;
      return;
    }
    this.shown = frame;
    this.sprite.setFrame(frame).setFlipX(arrow.flipX).setAngle(arrow.angle).setPosition(spriteX(arrow), arrow.y).setVisible(true);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
