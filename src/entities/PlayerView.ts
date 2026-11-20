/**
 * Draws one body as a sprite from the `pixel-player` atlas. One instance per body
 * (runner, twin), no module-level state. The frame comes from the pure
 * `playerFrame`; the sprite origin is the feet (pivot (0.5, 26/28) from the atlas),
 * so the whole-pixel feet position is the only thing placed here. Frames face
 * right and `flipX` turns them; the even 20 px cell flips about the feet column.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import type { PlayerState } from '../core/types';
import { PIXEL_KEYS, PLAYER_PIVOT } from '../fx';
import { playerFrame, type BodyName, type PlayerAnimTuning, type Transient, type TransientAnim } from './playerFrame';

const DEPTH_RUNNER = 10;
/** The twin is drawn behind the runner when they overlap (ADR "Tandem"). */
const DEPTH_TWIN = 9;

export class PlayerView {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private transient: Transient | null = null;
  private deathAge: number | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly body: BodyName,
    private readonly animTuning: PlayerAnimTuning,
    private reducedMotion = false,
  ) {
    this.sprite = scene.add
      .sprite(0, 0, PIXEL_KEYS.player, `player/${body}/white/idle_0`)
      .setOrigin(PLAYER_PIVOT.x, PLAYER_PIVOT.y)
      .setDepth(body === 'runner' ? DEPTH_RUNNER : DEPTH_TWIN);
  }

  /** Settings changed while paused: applies from the next pulse. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** Start a one-shot pose (land, jump, band-change flash). Reduced motion skips the flash. */
  pulse(anim: TransientAnim): void {
    if (anim === 'shift' && this.reducedMotion) return;
    this.transient = { anim, age: 0 };
  }

  /** `feetX`/`feetY`: already-snapped whole pixels of the feet (the sim's position). `dead` plays the death frames. */
  draw(feetX: number, feetY: number, player: PlayerState, dead: boolean): void {
    this.deathAge = dead ? (this.deathAge ?? -1) + 1 : null;
    if (this.transient !== null) this.transient = { ...this.transient, age: this.transient.age + 1 };
    const frame = playerFrame(player, this.body, { tuning: this.animTuning, transient: this.transient, deathAge: this.deathAge });
    this.sprite.setFrame(frame.name).setFlipX(frame.flipX).setPosition(feetX, feetY);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
