/**
 * PT-3: when a coloured tile lets you fall, the HUD rings the cell of the colour
 * you needed for 45 frames (0.75 s), plus one brightness pulse (not under reduced
 * motion). Respawn clears it; a new trigger replaces it (one cue per body).
 *
 * The trigger is a structural type, so this does not depend on the sim's
 * `fallThrough` event existing yet: the contract's `{ type, body, cells }` fits it
 * (batch 5). A plain `{ band }` (a coloured wall stop) fits too. Pure; the view
 * calls `updateCue` once per rendered frame.
 *
 * Owner: ui-engineer.
 */
import type { Band } from '../core/types';
import { palette } from '../fx/palette';

export const CUE_FRAMES = 45;
/** The brightness pulse lasts as long as the drop pulse (`palette.flash.durationMs`), in 60 Hz frames. */
export const CUE_PULSE_FRAMES = Math.ceil((palette.flash.durationMs / 1000) * 60);

export interface NeededColourEvent {
  readonly type?: string;
  /** Which body the event is about; absent means the runner (0). */
  readonly body?: number;
  /** The tiles that let the body go. The first one names the colour. */
  readonly cells?: readonly { readonly band: Band }[];
  /** Direct form: the band that acted. */
  readonly band?: Band;
}

export interface NeededColourCue {
  readonly band: Band;
  readonly framesLeft: number;
}

export interface CueView {
  readonly ringBand: Band;
  readonly pulse: boolean;
}

/** The cue an event starts for `body`, or null when it names no band or is about the other body. */
export function startCue(event: NeededColourEvent | null | undefined, body = 0): NeededColourCue | null {
  if (!event || (event.body ?? 0) !== body) return null;
  const band = event.cells?.[0]?.band ?? event.band;
  return band === undefined ? null : { band, framesLeft: CUE_FRAMES };
}

export interface CueInput {
  readonly event?: NeededColourEvent | null;
  readonly body?: number;
  /** The body respawned or the level restarted this frame. */
  readonly respawn?: boolean;
}

/** Next frame's cue: respawn clears, a trigger replaces, otherwise one frame is used up. */
export function updateCue(cue: NeededColourCue | null, input: CueInput = {}): NeededColourCue | null {
  if (input.respawn === true) return null;
  const started = startCue(input.event, input.body ?? 0);
  if (started !== null) return started;
  if (cue === null || cue.framesLeft <= 1) return null;
  return { band: cue.band, framesLeft: cue.framesLeft - 1 };
}

/** What the meter draws: the ringed cell, and whether the pulse is on this frame. */
export function cueView(cue: NeededColourCue | null, reducedMotion: boolean): CueView | null {
  if (cue === null) return null;
  const age = CUE_FRAMES - cue.framesLeft;
  return { ringBand: cue.band, pulse: !reducedMotion && age < CUE_PULSE_FRAMES };
}
