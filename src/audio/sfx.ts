// SFX player: turns cues into engine tones. Owner: audio-designer.
// Safe at any time: before the first gesture the engine ignores tone() and nothing throws.

import type { Band, BodyId, Gear } from '../core/types';
import type { AudioEngine } from './engine';
import type { CueLog } from './cueLog';
import { sfxForEvents, type SfxContext, type SfxSourceEvent } from './sfxEvents';
import { createShotLimiter } from './shotLimit';
import { describeSfx, type SfxCue } from './sfxSpec';

type ToneEngine = Pick<AudioEngine, 'tone'>;

/** Play one cue. Returns how many layers were scheduled (0 when locked, muted or at the voice cap). */
export function playCue(engine: ToneEngine, cue: SfxCue, log?: CueLog): number {
  let scheduled = 0;
  for (const layer of describeSfx(cue)) {
    if (engine.tone({ ...layer, bus: 'sfx' })) scheduled += 1;
  }
  log?.record(cue, scheduled > 0);
  return scheduled;
}

export interface Sfx {
  shiftUp(from?: Gear, to?: Gear): number;
  shiftDown(from?: Gear, to?: Gear): number;
  jump(band?: Band): number;
  land(band?: Band): number;
  fallThrough(): number;
  reset(): number;
  levelComplete(): number;
  /** Tandem: a body parked at its exit. */
  homeChime(body?: BodyId): number;
  uiMove(): number;
  uiSelect(): number;
  airDragClunk(): number;
  /** Hit-death cue (also used by the sweep). Normally reached via `playEvents`. */
  hitDeath(): number;
  /** A checkpoint post lit. Call once per lighting (scene detects `checkpoint.index` changing). */
  post(): number;
  /**
   * Emitter fire cue. Call once per shot that leaves an emitter currently ON SCREEN (the scene
   * decides; pass `onScreen = false` and it is dropped). Rate-limited here: at most one cue per
   * SHOT_MIN_GAP_MS and SHOT_BURST_MAX per SHOT_WINDOW_MS. `band` is the shot's band (pitch).
   * Returns layers scheduled (0 when dropped, locked or muted).
   */
  shot(band?: Band, onScreen?: boolean): number;
  /** Play the sounds for one step's sim events (the scene calls this once per step). */
  playEvents(events: readonly SfxSourceEvent[], ctx?: SfxContext): number;
}

/** One function per sound, bound to an engine. Every call is a no-op before the first gesture. */
export function createSfx(engine: ToneEngine, log?: CueLog, now?: () => number): Sfx {
  const allowShot = createShotLimiter(now);
  const play = (cue: SfxCue): number => playCue(engine, cue, log);
  return {
    shiftUp: (from, to) => play({ id: 'shiftUp', from, to }),
    shiftDown: (from, to) => play({ id: 'shiftDown', from, to }),
    jump: (band) => play({ id: 'jump', band }),
    land: (band) => play({ id: 'land', band }),
    fallThrough: () => play({ id: 'fallThrough' }),
    reset: () => play({ id: 'reset' }),
    levelComplete: () => play({ id: 'levelComplete' }),
    homeChime: (body) => play({ id: 'homeChime', body }),
    uiMove: () => play({ id: 'uiMove' }),
    uiSelect: () => play({ id: 'uiSelect' }),
    airDragClunk: () => play({ id: 'airDragClunk' }),
    hitDeath: () => play({ id: 'hitDeath' }),
    post: () => play({ id: 'post' }),
    shot: (band, onScreen = true) => (onScreen && allowShot() ? play({ id: 'shot', band }) : 0),
    playEvents: (events, ctx) => sfxForEvents(events, ctx).reduce((n, cue) => n + play(cue), 0),
  };
}
