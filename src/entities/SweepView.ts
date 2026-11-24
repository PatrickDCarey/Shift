/**
 * Draws the sweep (sweep.md): a hatched fill and a hard saw-tooth edge behind the front, under the bodies,
 * and, while the front is off screen to the left, a left-edge marker with a bar for the gap. White masks
 * tinted from the UI palette (never a band colour). Reduced motion holds frame 0 of each. Built only for
 * levels with a `sweep:` header. Audio hook (Could, sweep.md: a hum whose volume follows the gap): none
 * exists yet; the gap is `layout.markerGapTiles` while off screen. Render only; owner: [scene].
 */
import type Phaser from 'phaser';
import type { Level, SimState } from '../core/types';
import { hexToNumber, palette, PIXEL_KEYS, SWEEP_MARKER_W } from '../fx';
import { edgeFrame, fillFrame, gapBarPx, sweepFrontTiles, sweepLayout, type Rect } from './sweepPlan';

const DEPTH_FILL = 4; // above tiles and posts, below the bodies (9, 10)
const DEPTH_EDGE = 4.5;
const DEPTH_MARKER = 190; // under the HUD (200)
const FILL_ALPHA = 0.5;
const BAR_H = 4;
const MARKER_X = 2;

export class SweepView {
  private readonly fill: Phaser.GameObjects.TileSprite;
  private readonly edge: Phaser.GameObjects.TileSprite;
  private readonly marker: Phaser.GameObjects.Image;
  private readonly bar: Phaser.GameObjects.Rectangle;

  /** Null when the level has no sweep. */
  static forLevel(scene: Phaser.Scene, level: Level): SweepView | null {
    return level.sweep === undefined ? null : new SweepView(scene, level);
  }

  private constructor(
    scene: Phaser.Scene,
    private readonly level: Level,
  ) {
    const key = PIXEL_KEYS.kinetics;
    const text = hexToNumber(palette.ui.text);
    const muted = hexToNumber(palette.ui.textMuted);
    this.fill = scene.add.tileSprite(0, 0, 16, 16, key, 'sweep/fill/0').setOrigin(0, 0).setDepth(DEPTH_FILL).setTint(muted).setAlpha(FILL_ALPHA).setVisible(false);
    this.edge = scene.add.tileSprite(0, 0, 16, 16, key, 'sweep/edge/0').setOrigin(0, 0).setDepth(DEPTH_EDGE).setTint(text).setVisible(false);
    const midY = Math.round(scene.scale.height / 2);
    this.marker = scene.add.image(MARKER_X, midY, key, 'sweep/marker').setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH_MARKER).setTint(text).setVisible(false);
    this.bar = scene.add
      .rectangle(MARKER_X + SWEEP_MARKER_W + 2, midY - BAR_H / 2, 1, BAR_H, text)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_MARKER)
      .setVisible(false);
  }

  /** Once per rendered frame, with the camera's world view. */
  update(prev: SimState, state: SimState, alpha: number, view: Rect, timeMs: number, reduced: boolean): void {
    const sw = this.level.sweep;
    if (sw === undefined) return;
    const front = sweepFrontTiles(sw, prev, state, alpha, this.level.width);
    const layout = sweepLayout(front, view);
    this.place(this.fill, layout.fill, `sweep/fill/${fillFrame(timeMs, reduced)}`);
    this.place(this.edge, layout.edge, `sweep/edge/${edgeFrame(timeMs, reduced)}`);
    const gap = layout.markerGapTiles;
    this.marker.setVisible(gap !== null);
    this.bar.setVisible(gap !== null && gap > 0);
    if (gap !== null) this.bar.setSize(gapBarPx(gap), BAR_H);
  }

  private place(img: Phaser.GameObjects.TileSprite, rect: Rect | null, frame: string): void {
    img.setVisible(rect !== null);
    if (rect === null) return;
    img.setFrame(frame).setPosition(rect.x, rect.y).setSize(rect.w, rect.h);
  }

  destroy(): void {
    [this.fill, this.edge, this.marker, this.bar].forEach((o) => o.destroy());
  }
}
