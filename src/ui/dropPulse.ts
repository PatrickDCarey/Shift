/**
 * The drag-drop pulse of the HUD gear meter, as pure logic: when does a pulse
 * start, which cell does it light, when does it end. The view only supplies the
 * clock and draws the result. No Phaser, no DOM.
 *
 * Spec: docs/design/features/hud-gear-meter.md, "Drag drop" (the newly lit cell
 * pulses once; reduced motion: no pulse, snap only).
 *
 * Owner: ui-engineer.
 */
import type { Band } from '../core/types';
import type { GearMeterModel } from './gearMeter';

export interface DropPulse {
  /** The cell that lights up (the band the player dropped to). */
  readonly band: Band;
  /** Clock time (ms) at which the pulse ends. */
  readonly untilMs: number;
}

export interface DropPulseOptions {
  readonly reducedMotion: boolean;
  readonly durationMs: number;
}

/**
 * A drag drop: still in the air, the drag meter was showing, and the lit band
 * fell exactly one cell. A wall stop in the air (several cells at once), a
 * landing and a respawn are not drops.
 */
export function isDragDrop(prev: GearMeterModel | null, next: GearMeterModel): boolean {
  return (
    prev !== null &&
    prev.airborne &&
    next.airborne &&
    prev.dragFill !== null &&
    next.litBand === prev.litBand - 1
  );
}

/**
 * The pulse to draw this frame, given last frame's pulse and models. A running
 * pulse ends when its time is up or when its cell stops being the lit one.
 */
export function updateDropPulse(
  pulse: DropPulse | null,
  prev: GearMeterModel | null,
  next: GearMeterModel,
  nowMs: number,
  options: DropPulseOptions,
): DropPulse | null {
  if (options.reducedMotion) return null;
  if (isDragDrop(prev, next)) return { band: next.litBand, untilMs: nowMs + options.durationMs };
  if (pulse !== null && nowMs < pulse.untilMs && next.litBand === pulse.band) return pulse;
  return null;
}
