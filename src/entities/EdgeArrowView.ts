/**
 * The edge arrow that points at an off-screen Tandem body: a `hud/edge/<body>/<band>`
 * frame from the `pixel-hud` atlas. The band is carried by the frame's pattern ink
 * (never by colour alone). Screen-fixed, whole pixels. One instance per scene.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { PIXEL_KEYS, hudFrameNames } from '../fx/pixel';
import type { EdgeArrow } from './tandemView';

const DEPTH = 205;

export class EdgeArrowView {
  private readonly sprite: Phaser.GameObjects.Image;
  /** The frame on screen right now; null while hidden (exposed for the QA hook). */
  shown: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add
      .image(0, 0, PIXEL_KEYS.hud, hudFrameNames().edge('twin', 'white'))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
  }

  /** `arrow` null hides it. `body` and `band` choose the frame (`band` is a BAND_COLORS name). */
  update(arrow: EdgeArrow | null, body: string, band: string): void {
    if (arrow === null) {
      this.sprite.setVisible(false);
      this.shown = null;
      return;
    }
    this.shown = hudFrameNames().edge(body, band);
    this.sprite.setFrame(this.shown).setFlipX(arrow.flipX).setPosition(arrow.x, arrow.y).setVisible(true);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
