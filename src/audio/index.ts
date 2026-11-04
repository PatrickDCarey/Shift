// Adaptive music and SFX driven by sim events. Owner: audio-designer.
// Audio reads simulation state and never changes it. Phaser-independent.

import { createAudioEngine } from './engine';

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
