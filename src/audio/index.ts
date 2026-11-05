// Adaptive music and SFX driven by sim events. Owner: audio-designer.
// Audio reads simulation state and never changes it. Phaser-independent.

import { createAudioEngine } from './engine';
import { createSfx } from './sfx';

export {
  MAX_TONE_SECONDS,
  MAX_VOICES,
  createAudioEngine,
  type AudioBuses,
  type AudioEngine,
  type AudioEngineOptions,
  type AudioSettingsState,
  type AudioState,
  type BusName,
  type EventTargetLike,
  type SaveAudioSettings,
  type ToneOptions,
  type WaveType,
} from './engine';

/**
 * Shared engine for the whole game. Creating it touches no Web Audio API; the context
 * appears on the first user gesture (see `audio.installGestureUnlock()`).
 */
export const audio = createAudioEngine();

/** The ten sound effects on the shared engine, plus `sfx.playEvents(events, ctx)` for the scene. */
export const sfx = createSfx(audio);

export { createSfx, playCue, type Sfx } from './sfx';
export {
  sfxForEvent,
  sfxForEvents,
  type FallThroughEvent,
  type SfxContext,
  type SfxSourceEvent,
} from './sfxEvents';
export {
  BAND_PITCH,
  GEAR_NOTE_HZ,
  MAX_SHORT_SFX_SECONDS,
  MAX_STING_SECONDS,
  ALL_SFX_IDS,
  SFX_IDS,
  type TenSfxId,
  describeSfx,
  sfxDuration,
  type SfxCue,
  type SfxId,
  type ToneLayer,
} from './sfxSpec';
