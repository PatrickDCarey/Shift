// Pure description of every sound effect: frequencies, waves, envelopes, durations.
// Owner: audio-designer. No Web Audio, no Phaser, no randomness, no clock: the same cue
// always describes the same layers, so tests can check them without a context.
// Spec: docs/design/features/adaptive-audio.md. All constants live here, not in tuning.json.
//
// Each sound is a handful of `ToneLayer`s played together through the engine's `tone()`
// helper (oscillator + attack/exponential-decay envelope on the SFX bus).
//
// House rules (checked in sfxSpec.test.ts):
//  - short: every sound but the level-complete sting ends within MAX_SHORT_SFX_SECONDS, the
//    sting within MAX_STING_SECONDS;
//  - readable at low volume: every layer's peak is at least MIN_LAYER_GAIN and starts at or
//    above MIN_AUDIBLE_HZ (laptop speakers drop everything below that), and the summed
//    peaks stay under MAX_SUMMED_GAIN so a mix of several sounds does not clip;
//  - pace shows in sound: pitch climbs with gear and band, on one C major ladder, the key
//    the music will use.

import type { Band, BodyId, Gear } from '../core/types';
import type { WaveType } from './engine';

/** The ten sounds of M2-17. */
export type TenSfxId =
  | 'shiftUp'
  | 'shiftDown'
  | 'jump'
  | 'land'
  | 'fallThrough'
  | 'reset'
  | 'levelComplete'
  | 'uiMove'
  | 'uiSelect'
  | 'airDragClunk';

/** The ten plus the Tandem "park" chime (Should). */
export type SfxId = TenSfxId | 'homeChime';

export const SFX_IDS: readonly TenSfxId[] = [
  'shiftUp',
  'shiftDown',
  'jump',
  'land',
  'fallThrough',
  'reset',
  'levelComplete',
  'uiMove',
  'uiSelect',
  'airDragClunk',
];

export const ALL_SFX_IDS: readonly SfxId[] = [...SFX_IDS, 'homeChime'];

/** One oscillator with the engine's envelope (5 ms attack, exponential decay to `duration`). */
export interface ToneLayer {
  readonly freq: number;
  readonly endFreq?: number;
  readonly duration: number;
  readonly type: WaveType;
  /** Peak level 0..1 before the bus. */
  readonly gain: number;
  /** Seconds after the cue starts. */
  readonly delay: number;
}

/** What to play. Everything except `id` is optional context; defaults are listed below. */
export interface SfxCue {
  readonly id: SfxId;
  /**
   * Whose voice (Tandem). Default 0, the runner. 1 is the twin: the same sound a perfect
   * fourth lower and 3 dB softer. 'both' is the unison of the two for one event on one step:
   * each voice 3 dB further down, so the pair is no louder than a single body.
   */
  readonly body?: BodyId | 'both';
  /** Shift cues: gear before and after. Default 1 -> 2 for up, 2 -> 1 for down. */
  readonly from?: Gear;
  readonly to?: Gear;
  /** Jump, land: the (runner's) current band, for pace. Default 0. */
  readonly band?: Band;
  /** Unison only: the twin's band when it differs from `band`. */
  readonly twinBand?: Band;
  /** A buffered shift press: the shift click at half gain with the high end rolled off. */
  readonly soft?: boolean;
}

export const MAX_SHORT_SFX_SECONDS = 0.5;
export const MAX_STING_SECONDS = 1.2;
export const MIN_LAYER_GAIN = 0.1;
export const MAX_SUMMED_GAIN = 0.75;
/** Floor for a layer's start pitch only; a sweep may end below it. */
export const MIN_AUDIBLE_HZ = 150;

/** Twin voice: a perfect fourth down (5 semitones) and 3 dB softer. */
export const TWIN_PITCH_RATIO = Math.pow(2, -5 / 12);
export const TWIN_GAIN_SCALE = Math.pow(10, -3 / 20);
/** Each voice of a unison is a further 3 dB down. */
export const UNISON_GAIN_SCALE = Math.pow(10, -3 / 20);
/** A buffered shift is acknowledged at half gain. */
export const SOFT_GAIN_SCALE = 0.5;

/** C5 + 0, 4, 7, 12 semitones: gears 1..4 sit on a rising C major arpeggio. */
export const GEAR_NOTE_HZ: Readonly<Record<Gear, number>> = { 1: 523.25, 2: 659.26, 3: 783.99, 4: 1046.5 };

/** Pitch multiplier per band 0..4 (0, 2, 4, 5, 7 semitones, the music's offsets). */
export const BAND_PITCH: readonly [number, number, number, number, number] = [
  1,
  Math.pow(2, 2 / 12),
  Math.pow(2, 4 / 12),
  Math.pow(2, 5 / 12),
  Math.pow(2, 7 / 12),
];

const LEVEL_COMPLETE_NOTES: readonly number[] = [523.25, 659.26, 783.99, 1046.5];
const STING_STEP_SECONDS = 0.09;

function layer(
  freq: number,
  duration: number,
  type: WaveType,
  gain: number,
  delay = 0,
  endFreq?: number,
): ToneLayer {
  return endFreq === undefined ? { freq, duration, type, gain, delay } : { freq, endFreq, duration, type, gain, delay };
}

function gearOr(value: Gear | undefined, fallback: Gear): Gear {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : fallback;
}

function bandIndex(band: Band | undefined): Band {
  return band === 1 || band === 2 || band === 3 || band === 4 ? band : 0;
}

function bandMul(band: Band | undefined): number {
  return BAND_PITCH[bandIndex(band)];
}

/** Two clean square notes, old gear's note then new gear's: a bright rising click. */
function shiftUp(cue: SfxCue): ToneLayer[] {
  const from = gearOr(cue.from, 1);
  const to = gearOr(cue.to, from < 4 ? ((from + 1) as Gear) : 4);
  return [layer(GEAR_NOTE_HZ[from], 0.045, 'square', 0.22), layer(GEAR_NOTE_HZ[to], 0.07, 'square', 0.22, 0.045)];
}

/** The same two-note click falling, same timbre family: the player chose less. */
function shiftDown(cue: SfxCue): ToneLayer[] {
  const from = gearOr(cue.from, 2);
  const to = gearOr(cue.to, from > 1 ? ((from - 1) as Gear) : 1);
  return [layer(GEAR_NOTE_HZ[from], 0.045, 'square', 0.22), layer(GEAR_NOTE_HZ[to], 0.07, 'square', 0.22, 0.045)];
}

/** Buffered press: triangle (no high harmonics) at half gain. */
function softened(layers: ToneLayer[]): ToneLayer[] {
  return layers.map((l) => ({ ...l, type: 'triangle', gain: l.gain * SOFT_GAIN_SCALE }));
}

/** Upward chirp; the faster you are, the higher it starts. Same for coyote and buffered jumps. */
function jump(cue: SfxCue): ToneLayer[] {
  const m = bandMul(cue.band);
  return [layer(300 * m, 0.11, 'triangle', 0.26, 0, 640 * m), layer(900 * m, 0.04, 'square', 0.12, 0, 1400 * m)];
}

/** Soft low thump under 80 ms; a faster landing is higher and a little louder. */
function land(cue: SfxCue): ToneLayer[] {
  const m = bandMul(cue.band);
  return [layer(240 * m, 0.07, 'triangle', 0.22 + 0.015 * bandIndex(cue.band), 0, 120 * m)];
}

/** Hollow downward whoosh with a detuned glassy partner: the floor let you go. */
function fallThrough(): ToneLayer[] {
  return [layer(760, 0.3, 'sine', 0.24, 0, 170), layer(1180, 0.22, 'triangle', 0.14, 0.02, 330)];
}

/** Death or restart: one quick descending sweep, like a rewind. Respawn itself is silent. */
function reset(): ToneLayer[] {
  return [layer(520, 0.34, 'sawtooth', 0.18, 0, 110), layer(260, 0.34, 'square', 0.1, 0.02, 70)];
}

/** Rising C major arpeggio C5 E5 G5 C6, the last note ringing: a resolved sting in the music's key. */
function levelComplete(): ToneLayer[] {
  const n = LEVEL_COMPLETE_NOTES;
  const top = n[n.length - 1] ?? 1046.5;
  const lastDelay = (n.length - 1) * STING_STEP_SECONDS;
  const layers = n.map((hz, i) =>
    i === n.length - 1 ? layer(hz, 0.55, 'square', 0.16, lastDelay) : layer(hz, 0.1, 'square', 0.15, i * STING_STEP_SECONDS),
  );
  layers.push(layer(top * 2, 0.5, 'triangle', 0.1, lastDelay));
  return layers;
}

/** A tiny high tick. */
function uiMove(): ToneLayer[] {
  return [layer(1200, 0.03, 'square', 0.14, 0, 1300)];
}

/** A firmer tick, lower than UI move. */
function uiSelect(): ToneLayer[] {
  return [layer(740, 0.06, 'square', 0.2, 0, 600), layer(370, 0.07, 'triangle', 0.16)];
}

/**
 * Air-drag clunk: ONE hard attack (every layer starts together) with a short pitch drop,
 * 140 ms. A sawtooth fundamental at 200 Hz falling to 80 Hz plus a slightly sour square for
 * grit. Everything sits below 261 Hz, more than an octave under the shift-down click (lowest
 * note C5, 523 Hz). Fixed pitch on purpose: the music snapping darker carries the band.
 */
function airDragClunk(): ToneLayer[] {
  return [layer(200, 0.14, 'sawtooth', 0.26, 0, 80), layer(230, 0.11, 'square', 0.2, 0, 100)];
}

/** Two quick rising notes: a body is parked at its exit. */
function homeChime(): ToneLayer[] {
  return [layer(784, 0.07, 'triangle', 0.2), layer(1047, 0.12, 'triangle', 0.2, 0.07)];
}

function baseLayers(cue: SfxCue): ToneLayer[] {
  switch (cue.id) {
    case 'shiftUp':
      return shiftUp(cue);
    case 'shiftDown':
      return shiftDown(cue);
    case 'jump':
      return jump(cue);
    case 'land':
      return land(cue);
    case 'fallThrough':
      return fallThrough();
    case 'reset':
      return reset();
    case 'levelComplete':
      return levelComplete();
    case 'uiMove':
      return uiMove();
    case 'uiSelect':
      return uiSelect();
    case 'airDragClunk':
      return airDragClunk();
    case 'homeChime':
      return homeChime();
    default:
      return [];
  }
}

function scaled(l: ToneLayer, pitch: number, gain: number): ToneLayer {
  const out = { ...l, freq: l.freq * pitch, gain: l.gain * gain };
  return l.endFreq === undefined ? out : { ...out, endFreq: l.endFreq * pitch };
}

/** Sounds that belong to a body; UI and run-level sounds ignore `body`. */
function isBodySound(id: SfxId): boolean {
  return id !== 'levelComplete' && id !== 'uiMove' && id !== 'uiSelect' && id !== 'reset';
}

function bodyLayers(cue: SfxCue): ToneLayer[] {
  const soft = (ls: ToneLayer[]): ToneLayer[] => (cue.soft ? softened(ls) : ls);
  const runner = soft(baseLayers(cue));
  if (!isBodySound(cue.id) || cue.body === undefined || cue.body === 0) return runner;
  const twin = soft(baseLayers({ ...cue, band: cue.twinBand ?? cue.band }));
  if (cue.body === 1) return twin.map((l) => scaled(l, TWIN_PITCH_RATIO, TWIN_GAIN_SCALE));
  return [
    ...runner.map((l) => scaled(l, 1, UNISON_GAIN_SCALE)),
    ...twin.map((l) => scaled(l, TWIN_PITCH_RATIO, TWIN_GAIN_SCALE * UNISON_GAIN_SCALE)),
  ];
}

/** The layers of one cue. Pure; unknown ids give an empty list. */
export function describeSfx(cue: SfxCue): readonly ToneLayer[] {
  return bodyLayers(cue);
}

/** Seconds from the cue start until the last layer ends. */
export function sfxDuration(layers: readonly ToneLayer[]): number {
  return layers.reduce((end, l) => Math.max(end, l.delay + l.duration), 0);
}

/** Sum of layer peaks (an upper bound of the loudest instant). */
export function sfxPeakSum(layers: readonly ToneLayer[]): number {
  return layers.reduce((sum, l) => sum + l.gain, 0);
}
