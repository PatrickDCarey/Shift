// Pure description of the adaptive music: band targets, the loop pattern, glide maths and
// the "which body drives" rule. Owner: audio-designer. No Web Audio, no clock, no randomness.
// Spec: docs/design/features/adaptive-audio.md "Music per band".

import type { Band } from '../core/types';

export type MusicLayerId = 'pad' | 'bass' | 'pulse' | 'hats' | 'lead';
export const MUSIC_LAYERS: readonly MusicLayerId[] = ['pad', 'bass', 'pulse', 'hats', 'lead'];

export interface BandTarget {
  /** Semitones above the loop's written pitch. All inside one major scale (1st, 2nd, 3rd, 4th, 5th). */
  readonly semitones: number;
  /** Low-pass cutoff in Hz. */
  readonly cutoffHz: number;
  /** Layers audible at this band. */
  readonly layers: readonly MusicLayerId[];
}

/** White is the lowest and darkest; each band is higher and brighter than the one below. */
export const BAND_TARGETS: readonly [BandTarget, BandTarget, BandTarget, BandTarget, BandTarget] = [
  { semitones: 0, cutoffHz: 400, layers: ['pad'] },
  { semitones: 2, cutoffHz: 800, layers: ['pad', 'bass'] },
  { semitones: 4, cutoffHz: 1600, layers: ['pad', 'bass', 'pulse'] },
  { semitones: 5, cutoffHz: 3200, layers: ['pad', 'bass', 'pulse', 'hats'] },
  { semitones: 7, cutoffHz: 14000, layers: ['pad', 'bass', 'pulse', 'hats', 'lead'] },
];

export const GLIDE_SECONDS = 0.15;
export const SNAP_SECONDS = 0.03;
export const DEATH_GLIDE_SECONDS = 0.4;
export const WIN_FADE_SECONDS = 0.6;
export const PAUSE_DUCK_DB = -12;
export const PAUSE_DUCK_GAIN = Math.pow(10, PAUSE_DUCK_DB / 20);
/** The band 0 cutoff, used on pause, death and win. */
export const DARK_CUTOFF_HZ = BAND_TARGETS[0].cutoffHz;

/** Level of each layer when it is on (before the music bus). */
export const LAYER_LEVEL: Readonly<Record<MusicLayerId, number>> = {
  pad: 0.5,
  bass: 0.55,
  pulse: 0.28,
  hats: 0.16,
  lead: 0.3,
};

export function bandTarget(band: Band): BandTarget {
  return BAND_TARGETS[band >= 0 && band <= 4 ? band : 0]!;
}

// ---- Glide (immutable) ----

/** A value moving linearly from `from` to `to` between `start` and `start + duration`. */
export interface Glide {
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly duration: number;
}

export function steadyGlide(value: number): Glide {
  return { from: value, to: value, start: 0, duration: 0 };
}

export function glideValue(g: Glide, time: number): number {
  if (g.duration <= 0 || time >= g.start + g.duration) return g.to;
  if (time <= g.start) return g.from;
  return g.from + (g.to - g.from) * ((time - g.start) / g.duration);
}

/** Start a new glide from wherever the old one is at `now`. */
export function retarget(g: Glide, now: number, to: number, duration: number): Glide {
  return { from: glideValue(g, now), to, start: now, duration };
}

/** Hz to log2 Hz and back, so a cutoff glide is even to the ear (and matches an exponential ramp). */
export const toLog2 = (hz: number): number => Math.log2(hz);
export const fromLog2 = (v: number): number => Math.pow(2, v);

// ---- Which body drives ----

export interface BodyBand {
  readonly band: Band;
  readonly home: boolean;
}

/**
 * Band of the body the camera follows: the fastest non-home body (on a tie, the runner,
 * body 0). With every body home, the runner's band.
 */
export function drivingBand(bodies: readonly BodyBand[]): Band {
  let best: BodyBand | undefined;
  for (const body of bodies) {
    if (body.home) continue;
    if (!best || body.band > best.band) best = body;
  }
  return (best ?? bodies[0])?.band ?? 0;
}

// ---- The loop ----

/** 16th-note step length: 100 bpm. */
export const STEP_SECONDS = 0.15;
export const STEPS_PER_BAR = 16;
/** C, A minor, F, G: four bars (9.6 s). Semitones of each bar's root above the loop key C. */
export const BAR_ROOTS: readonly number[] = [0, -3, -7, -5];
export const LOOP_STEPS = STEPS_PER_BAR * BAR_ROOTS.length;
/** The loop key's pad root: C3. */
export const KEY_HZ = 130.81;

export interface MusicNote {
  readonly layer: MusicLayerId;
  /** Semitones above KEY_HZ, before the band offset. */
  readonly semitones: number;
  /** Seconds from the step start. */
  readonly delay: number;
  readonly duration: number;
  readonly wave: 'sine' | 'square' | 'sawtooth' | 'triangle';
  /** Peak 0..1 before the layer level. */
  readonly peak: number;
  /** Hats only: an absolute pitch that does not follow the band. */
  readonly fixedHz?: number;
}

const TRIAD = [0, 4, 7] as const;
const ARP = [0, 4, 7, 12, 7, 4, 12, 16] as const;
/** Lead melody on the C major pentatonic, absolute (not chord-relative): C5 E5 G5 E5 D5 C5. */
const LEAD_STEPS: Readonly<Record<number, number>> = { 0: 24, 3: 28, 6: 31, 8: 28, 11: 26, 14: 24 };

/** Notes that start on `step` (0..LOOP_STEPS-1; wraps). Pure: the same step gives the same notes. */
export function notesAt(step: number): readonly MusicNote[] {
  const s = ((Math.floor(step) % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
  const bar = Math.floor(s / STEPS_PER_BAR);
  const inBar = s % STEPS_PER_BAR;
  const root = BAR_ROOTS[bar]!;
  const out: MusicNote[] = [];
  if (inBar === 0) {
    const length = STEPS_PER_BAR * STEP_SECONDS;
    for (const t of TRIAD) {
      out.push({ layer: 'pad', semitones: root + t, delay: 0, duration: length + 0.3, wave: 'triangle', peak: 0.34 });
    }
  }
  if (inBar === 0 || inBar === 6 || inBar === 10) {
    out.push({ layer: 'bass', semitones: root - 12, delay: 0, duration: 0.24, wave: 'sawtooth', peak: 0.5 });
  }
  if (inBar % 2 === 0) {
    const arp = ARP[(inBar / 2) % ARP.length]!;
    out.push({ layer: 'pulse', semitones: root + arp + 12, delay: 0, duration: 0.11, wave: 'square', peak: 0.5 });
  }
  if (inBar % 2 === 1) {
    out.push({ layer: 'hats', semitones: 0, delay: 0, duration: 0.035, wave: 'square', peak: 0.7, fixedHz: 5200 + (inBar % 4 === 3 ? 600 : 0) });
  }
  const lead = LEAD_STEPS[inBar];
  if (lead !== undefined) {
    out.push({ layer: 'lead', semitones: lead, delay: 0, duration: 0.3, wave: 'triangle', peak: 0.55 });
  }
  return out;
}

/** Frequency of a note when the music is `bandSemitones` above its written pitch. */
export function noteHz(note: MusicNote, bandSemitones: number): number {
  if (note.fixedHz !== undefined) return note.fixedHz;
  return KEY_HZ * Math.pow(2, (note.semitones + bandSemitones) / 12);
}
