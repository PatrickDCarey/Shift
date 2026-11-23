// Adaptive music and SFX driven by sim events. Owner: audio-designer.
// Audio reads simulation state and never changes it. Phaser-independent.

import { createAudioEngine } from './engine';
import { createMusic } from './music';
import { createCueLog, type CueLogEntry } from './cueLog';
import { createSfx } from './sfx';
import { createStepEventPlayer } from './sfxStep';
import type { Band } from '../core/types';
export { SHOT_BURST_MAX, SHOT_MIN_GAP_MS, SHOT_WINDOW_MS, createShotLimiter } from './shotLimit';

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
/** Last 64 SFX cues requested, for QA (the scene exposes it on the QA hook only). */
const cueLog = createCueLog();
export const debugCues = (): CueLogEntry[] => cueLog.recent();

export const sfx = createSfx(audio, cueLog);

/**
 * The one in-game SFX call: `playStepEvents(events, { bands })` once per rendered frame with the
 * flat list of sim events from every step that frame (`[]` while paused). Plays each event's
 * sound in order; `won` plays only the sting; honours mute and the saved volumes.
 */
export const playStepEvents = createStepEventPlayer(audio, cueLog);

/**
 * The scene's shot cue: `playShot(band, onScreen)` when an emitter fires (render side, from
 * `nextShotIn(emitter, step) === 0` or equivalent). Rate limit lives inside; see `Sfx.shot`.
 */
export const playShot = (band?: Band, onScreen?: boolean): number => sfx.shot(band, onScreen);

/** The scene's checkpoint cue: call `playPost()` once per post lit. Silent when muted or before the first gesture. */
export const playPost = (): number => sfx.post();

/** The adaptive music on the shared engine: call `music.update(frame)` once per rendered frame. */
export const music = createMusic(audio);

export { createMusic, type Music, type MusicFrame, type MusicMode, type MusicSnapshot } from './music';
export {
  BAND_TARGETS,
  DARK_CUTOFF_HZ,
  GLIDE_SECONDS,
  SNAP_SECONDS,
  drivingBand,
  type BodyBand,
  type MusicLayerId,
} from './musicSpec';
export { createSfx, playCue, type Sfx } from './sfx';
export { createCueLog, CUE_LOG_SIZE, type CueLog, type CueLogEntry } from './cueLog';
export { createStepEventPlayer } from './sfxStep';
export {
  sfxForEvent,
  sfxForEvents,
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
export { bodiesOf, musicEventsOf, musicFeed } from './musicFeed';
