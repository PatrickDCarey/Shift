/**
 * Render-only feedback for sim events: the drag-drop wipe and ring burst
 * (docs/art/style.md "Drag-downshift event") and a brief flash on death.
 * What runs comes from `effectModes(settings, hasTwin)` (reduced motion drops the
 * wipe, ring and death flash; a Tandem level never gets a wipe). Every white
 * flash or wipe asks `requestFlash` first (3 per second across the screen).
 * Never touches sim state; audio is not here.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { effectFrameNames, hexToNumber, palette, PIXEL_KEYS, requestFlash, wipeAt, type EffectModes, type FlashHistory } from '../fx';
import { effectProgress, flashAlpha } from './effectMath';

const DEPTH_RING = 20;
const DEPTH_WIPE = 99;
const DEPTH_FLASH = 100;
const RING_MS = 220;
const RING_MAX_RADIUS = 21;
const RING_MIN_RADIUS = 6;
const RING_LINE_WIDTH = 1;

interface Ring {
  readonly x: number;
  readonly y: number;
  readonly startedAt: number;
}

export class FeedbackFx {
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly wipe: Phaser.GameObjects.Image;
  private readonly ringGfx: Phaser.GameObjects.Graphics;
  /** `palette.flash` read once at creation: one colour, peak alpha and duration for every flash. */
  private readonly flashSpec = palette.flash;
  private nowMs = 0;
  private flashStart = 0;
  private flashPeak = 0;
  private wipeStart: number | null = null;
  private flashes: FlashHistory = [];
  private rings: readonly Ring[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly modes: EffectModes,
  ) {
    const { width, height } = scene.scale;
    this.flash = scene.add.rectangle(0, 0, width, height, 0xffffff, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH_FLASH);
    this.wipe = scene.add
      .image(0, 0, PIXEL_KEYS.fx, effectFrameNames().wipe(0))
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_WIPE)
      .setTint(hexToNumber(this.flashSpec.color))
      .setVisible(false);
    this.ringGfx = scene.add.graphics().setDepth(DEPTH_RING);
  }

  /** A body's air drag dropped a band: the ring at its centre (pixels), and the screen wipe in a single-body level. */
  airDrag(centerX: number, centerY: number): void {
    if (this.modes.ringBurst) this.rings = [...this.rings, { x: centerX, y: centerY, startedAt: this.nowMs }];
    if (this.modes.screenWipe && this.takeFlash()) this.wipeStart = this.nowMs;
  }

  died(): void {
    if (!this.modes.deathFlash || !this.takeFlash()) return;
    this.flashStart = this.nowMs;
    this.flashPeak = this.flashSpec.alpha;
    this.flash.setFillStyle(hexToNumber(palette.gears.red.solid.fill), this.flashPeak);
  }

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    this.flash.setFillStyle(this.flash.fillColor, flashAlpha(this.flashPeak, this.nowMs - this.flashStart, this.flashSpec.durationMs));
    this.drawWipe();
    this.drawRings();
  }

  destroy(): void {
    this.flash.destroy();
    this.wipe.destroy();
    this.ringGfx.destroy();
  }

  /** Ask the 3-per-second cap for a white flash or wipe now. */
  private takeFlash(): boolean {
    const r = requestFlash(this.flashes, this.nowMs);
    this.flashes = r.history;
    return r.allowed;
  }

  private drawWipe(): void {
    const step = this.wipeStart === null ? null : wipeAt(this.nowMs - this.wipeStart);
    if (step === null) {
      this.wipeStart = null;
      this.wipe.setVisible(false);
      return;
    }
    this.wipe.setFrame(effectFrameNames().wipe(step.frame)).setAlpha(step.alpha).setVisible(true);
  }

  private drawRings(): void {
    const g = this.ringGfx;
    g.clear();
    this.rings = this.rings.filter((r) => effectProgress(this.nowMs - r.startedAt, RING_MS) !== null);
    for (const r of this.rings) {
      const t = effectProgress(this.nowMs - r.startedAt, RING_MS) ?? 1;
      g.lineStyle(RING_LINE_WIDTH, hexToNumber(this.flashSpec.color), 1 - t);
      g.strokeCircle(r.x, r.y, RING_MIN_RADIUS + (RING_MAX_RADIUS - RING_MIN_RADIUS) * t);
    }
  }
}
