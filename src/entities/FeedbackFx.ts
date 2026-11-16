/**
 * Render-only feedback for sim events: the air-drag flash plus ring burst
 * (docs/art/style.md "Drag-downshift flash") and a brief flash on death.
 * Honours prefers-reduced-motion (no full-screen flash, no burst) and the
 * three-flashes-per-second cap. Never touches sim state; audio is not here.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { hexToNumber, palette } from '../fx';
import { effectProgress, flashAllowed, flashAlpha } from './effectMath';

const DEPTH_RING = 20;
const DEPTH_FLASH = 100;
const RING_MS = 220;
const RING_MAX_RADIUS = 21;
const RING_MIN_RADIUS = 6;
const RING_LINE_WIDTH = 1;
const DEATH_FLASH_MS = 200;

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

interface Ring {
  readonly x: number;
  readonly y: number;
  readonly startedAt: number;
}

export class FeedbackFx {
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly ringGfx: Phaser.GameObjects.Graphics;
  private readonly reduced = reducedMotion();
  private nowMs = 0;
  private flashStart = 0;
  private flashPeak = 0;
  private flashDuration = 0;
  private lastFlashAt: number | null = null;
  private rings: readonly Ring[] = [];

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.flash = scene.add
      .rectangle(0, 0, width, height, 0xffffff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_FLASH);
    this.ringGfx = scene.add.graphics().setDepth(DEPTH_RING);
  }

  /** Air drag dropped a band: full-screen flash and a ring at the player's centre (pixels). */
  airDrag(centerX: number, centerY: number): void {
    if (this.reduced) return;
    const f = palette.flash;
    this.startFlash(hexToNumber(f.color), f.alpha, f.durationMs);
    this.rings = [...this.rings, { x: centerX, y: centerY, startedAt: this.nowMs }];
  }

  died(): void {
    if (this.reduced) return;
    this.startFlash(hexToNumber(palette.gears.red.solid.fill), palette.flash.alpha, DEATH_FLASH_MS);
  }

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    this.flash.setFillStyle(this.flash.fillColor, flashAlpha(this.flashPeak, this.nowMs - this.flashStart, this.flashDuration));
    this.drawRings();
  }

  destroy(): void {
    this.flash.destroy();
    this.ringGfx.destroy();
  }

  private startFlash(color: number, alpha: number, durationMs: number): void {
    if (!flashAllowed(this.lastFlashAt, this.nowMs)) return;
    this.lastFlashAt = this.nowMs;
    this.flashStart = this.nowMs;
    this.flashPeak = alpha;
    this.flashDuration = durationMs;
    this.flash.setFillStyle(color, alpha);
  }

  private drawRings(): void {
    const g = this.ringGfx;
    g.clear();
    this.rings = this.rings.filter((r) => effectProgress(this.nowMs - r.startedAt, RING_MS) !== null);
    for (const r of this.rings) {
      const t = effectProgress(this.nowMs - r.startedAt, RING_MS) ?? 1;
      g.lineStyle(RING_LINE_WIDTH, hexToNumber(palette.flash.color), 1 - t);
      g.strokeCircle(r.x, r.y, RING_MIN_RADIUS + (RING_MAX_RADIUS - RING_MIN_RADIUS) * t);
    }
  }
}
