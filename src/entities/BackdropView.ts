/**
 * The background behind the tiles (docs/art/style.md "Scenery"), back to front:
 * the camera's flat field colour (set by `CameraRig`), a dithered horizon glow,
 * stars, a far ridge and a near ridge. All are white masks from `pixel-scenery`,
 * tinted each frame from `sceneryColors(speed)` so the world hue follows speed.
 * Horizon and stars are screen-fixed; the ridges repeat every 480 px and scroll
 * with the camera at two parallax factors, or stay fixed under reduced motion.
 * "Reduced effects" drops the horizon and stars (`effectModes`). Whole pixels.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { hexToNumber, PIXEL_KEYS, rgbToHex, sceneryColors, type EffectModes } from '../fx';
import { RIDGES, VIEW_W } from '../fx/pixel';

/** Below the tiles (depth 0) and the hints. */
const DEPTH = -30;

type Layer = keyof typeof RIDGES;

/** The x of the left copy of a repeating ridge: the camera scroll scaled, wrapped to one tile width, whole pixels. */
export function ridgeOffset(scrollX: number, factor: number): number {
  const wrapped = Math.floor(scrollX * factor) % VIEW_W;
  return -(wrapped < 0 ? wrapped + VIEW_W : wrapped);
}

const num = (rgb: Parameters<typeof rgbToHex>[0]): number => hexToNumber(rgbToHex(rgb));

export class BackdropView {
  private readonly horizon: Phaser.GameObjects.Image;
  private readonly stars: Phaser.GameObjects.Image;
  private readonly ridges: Readonly<Record<Layer, readonly Phaser.GameObjects.Image[]>>;
  private lastKey = '';

  constructor(
    scene: Phaser.Scene,
    private modes: EffectModes,
    private readonly topSpeed: number,
  ) {
    const fixed = (frame: string, depth: number, y = 0, x = 0): Phaser.GameObjects.Image =>
      scene.add.image(x, y, PIXEL_KEYS.scenery, frame).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
    this.horizon = fixed('bg/horizon', DEPTH).setVisible(modes.horizonDither);
    this.stars = fixed('bg/stars', DEPTH + 1).setVisible(modes.stars);
    const pair = (layer: Layer, depth: number): readonly Phaser.GameObjects.Image[] => [
      fixed(`bg/ridge_${layer}`, depth, RIDGES[layer].top),
      fixed(`bg/ridge_${layer}`, depth, RIDGES[layer].top, VIEW_W),
    ];
    this.ridges = { far: pair('far', DEPTH + 2), near: pair('near', DEPTH + 3) };
  }

  /** Once per frame: retint for the eased `speed` and slide the ridges to `scrollX`. */
  update(speed: number, scrollX: number): void {
    const c = sceneryColors(speed, this.topSpeed);
    const key = `${num(c.hue)}:${num(c.star)}:${num(c.ridgeFar)}:${num(c.ridgeNear)}:${c.horizonAlpha}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.horizon.setTint(num(c.hue)).setAlpha(c.horizonAlpha);
      this.stars.setTint(num(c.star));
      this.ridges.far.forEach((i) => i.setTint(num(c.ridgeFar)));
      this.ridges.near.forEach((i) => i.setTint(num(c.ridgeNear)));
    }
    for (const layer of ['far', 'near'] as const) {
      const x = this.modes.ridgeParallax ? ridgeOffset(scrollX, RIDGES[layer].parallax) : 0;
      this.ridges[layer].forEach((img, i) => img.setX(x + i * VIEW_W));
    }
  }

  /** Settings changed while paused: layers show or hide now, parallax follows from the next frame. */
  setModes(modes: EffectModes): void {
    this.modes = modes;
    this.horizon.setVisible(modes.horizonDither);
    this.stars.setVisible(modes.stars);
  }

  destroy(): void {
    this.horizon.destroy();
    this.stars.destroy();
    for (const l of ['far', 'near'] as const) this.ridges[l].forEach((i) => i.destroy());
  }
}
