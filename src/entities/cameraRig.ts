/**
 * The scene's camera work: follow the snapped bodies, point the Tandem edge
 * arrow at a body left behind, and ease the background tint with speed. Reads
 * sim data, never writes it. Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { BAND_COLORS, type Level, type SimState } from '../core/types';
import type { Tuning } from '../core';
import { backgroundForSpeed, hexToNumber, rgbToHex } from '../fx';
import { hudFrameNames } from '../fx/pixel';
import { exitCue } from './exitCue';
import { cameraScroll, type CameraBody } from './camera';
import { EdgeArrowView } from './EdgeArrowView';
import { easeToward } from './interpolation';
import { edgeArrowPlacement, tandemCamera } from './tandemView';

/** The world tint follows actual speed, eased so it never flickers at a band edge (docs/art/style.md). */
const TINT_EASE_MS = 100;

/** One under the twin arrow's depth (205): the twin's arrow wins an overlap. */
const DEPTH_EXIT_ARROW = 204;

interface Feet {
  readonly px: number;
  readonly py: number;
}

export class CameraRig {
  private readonly edgeArrow: EdgeArrowView;
  private readonly exitArrow: EdgeArrowView;
  /** Last whole-pixel camera focus; kept when every body is home. */
  private lastFocus: { readonly x: number; readonly y: number } | null = null;
  private tintSpeed = 0;
  private lastBackground = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tuning: Tuning,
    private readonly exits: readonly { readonly col: number; readonly row: number }[] = [],
  ) {
    this.edgeArrow = new EdgeArrowView(scene);
    this.exitArrow = new EdgeArrowView(scene, DEPTH_EXIT_ARROW);
  }

  /** Scroll from the snapped integer bodies; keeps the last scroll when every body is home. Then the edge arrow. */
  follow(level: Level, bodies: readonly CameraBody[], twin: Feet | null, twinState: SimState['twin'], bodyHeightPx: number): void {
    const ts = this.tuning.tileSize;
    const cam = this.scene.cameras.main;
    const framed = tandemCamera(bodies, bodyHeightPx, ts, this.tuning.cameraMaxApartTiles);
    const focus = framed ?? this.lastFocus;
    if (focus !== null) {
      this.lastFocus = { x: focus.x, y: focus.y };
      const s = cameraScroll(focus.x, focus.y, cam.width, cam.height, level.width * ts, level.height * ts);
      cam.setScroll(s.x, s.y);
    }
    this.updateEdgeArrow(framed?.edgeBody ?? null, twin, twinState, bodyHeightPx);
    const cue = exitCue(this.exits, { x: cam.scrollX, y: cam.scrollY }, { w: cam.width, h: cam.height }, ts);
    this.exitArrow.update(cue, hudFrameNames().exitEdge);
  }

  /** The eased speed the world tint follows (the backdrop tints from the same value). */
  get tintedSpeed(): number {
    return this.tintSpeed;
  }

  /** Near-black standing, a dark hue of the band when moving; background only, never over tiles. */
  applyTint(speed: number, deltaMs: number): void {
    this.tintSpeed = easeToward(this.tintSpeed, speed, deltaMs, TINT_EASE_MS);
    const top = Math.max(...this.tuning.gearSpeeds);
    const color = hexToNumber(rgbToHex(backgroundForSpeed(this.tintSpeed, top)));
    if (color === this.lastBackground) return;
    this.lastBackground = color;
    this.scene.cameras.main.setBackgroundColor(color);
  }

  destroy(): void {
    this.edgeArrow.destroy();
    this.exitArrow.destroy();
  }

  /** Tandem: an arrow at the screen edge for the body the camera left behind, band by pattern. */
  private updateEdgeArrow(edgeBody: number | null, twin: Feet | null, twinState: SimState['twin'], bodyHeightPx: number): void {
    const cam = this.scene.cameras.main;
    const target = edgeBody === 1 && twin !== null && twinState !== null ? twin : null;
    const arrow =
      target === null ? null : edgeArrowPlacement(target, bodyHeightPx, { x: cam.scrollX, y: cam.scrollY }, { w: cam.width, h: cam.height });
    this.edgeArrow.update(arrow, hudFrameNames().edge('twin', BAND_COLORS[twinState?.band ?? 0]));
  }
}
