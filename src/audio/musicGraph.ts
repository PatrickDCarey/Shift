// Web Audio plumbing for the adaptive music: layer buses, low-pass filter, duck, note voices.
// Owner: audio-designer. No decisions here; music.ts decides, this file schedules.
//
// Signal path: note voice -> layer gain -> low-pass filter -> duck gain -> music bus.

import {
  MUSIC_LAYERS,
  PAUSE_DUCK_GAIN,
  LAYER_LEVEL,
  noteHz,
  type MusicLayerId,
  type MusicNote,
} from './musicSpec';
import { releaseNodes, startVoice, type Voice } from './toneVoice';
import type { AudioContextLike, AudioParamLike, BiquadFilterNodeLike, GainNodeLike } from './webAudioTypes';

const FILTER_Q = 0.9;
const MIN_GAIN = 0.0001;

interface LiveVoice {
  readonly voice: Voice;
  readonly note: MusicNote;
  readonly end: number;
}

export interface MusicGraph {
  readonly ctx: AudioContextLike;
  readonly filter: BiquadFilterNodeLike;
  readonly duck: GainNodeLike;
  readonly layers: Readonly<Record<MusicLayerId, GainNodeLike>>;
  live: LiveVoice[];
}

/** Build the music nodes under `bus`. Null when the context has no biquad filter (music stays off). */
export function buildMusicGraph(ctx: AudioContextLike, bus: GainNodeLike): MusicGraph | null {
  if (typeof ctx.createBiquadFilter !== 'function') return null;
  const filter = ctx.createBiquadFilter();
  const duck = ctx.createGain();
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(FILTER_Q, ctx.currentTime);
  filter.connect(duck);
  duck.connect(bus);
  const layers = {} as Record<MusicLayerId, GainNodeLike>;
  for (const id of MUSIC_LAYERS) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(MIN_GAIN, ctx.currentTime);
    g.connect(filter);
    layers[id] = g;
  }
  return { ctx, filter, duck, layers, live: [] };
}

/** Move `param` from `from` to `to` over `seconds` starting `now` (instant when seconds is 0). */
function ramp(param: AudioParamLike, now: number, from: number, to: number, seconds: number, exponential: boolean): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(Math.max(from, MIN_GAIN), now);
  const end = now + Math.max(seconds, 0.001);
  if (exponential) param.exponentialRampToValueAtTime(Math.max(to, MIN_GAIN), end);
  else param.linearRampToValueAtTime(Math.max(to, MIN_GAIN), end);
}

/** Low-pass cutoff glide. Exponential, so it is even to the ear. */
export function glideCutoff(g: MusicGraph, now: number, fromHz: number, toHz: number, seconds: number): void {
  ramp(g.filter.frequency, now, fromHz, toHz, seconds, true);
}

/** Fade each layer to its level (on) or silence (off). `from` holds the layers on before. */
export function glideLayers(g: MusicGraph, now: number, from: ReadonlySet<MusicLayerId>, to: ReadonlySet<MusicLayerId>, seconds: number): void {
  for (const id of MUSIC_LAYERS) {
    const a = from.has(id) ? LAYER_LEVEL[id] : MIN_GAIN;
    const b = to.has(id) ? LAYER_LEVEL[id] : MIN_GAIN;
    ramp(g.layers[id].gain, now, a, b, seconds, false);
  }
}

export function glideDuck(g: MusicGraph, now: number, on: boolean, seconds: number): void {
  const target = on ? PAUSE_DUCK_GAIN : 1;
  ramp(g.duck.gain, now, on ? 1 : PAUSE_DUCK_GAIN, target, seconds, false);
}

/** Bend every sounding, not-yet-ended voice to the new pitch over `seconds`. */
export function glidePitch(g: MusicGraph, now: number, fromSemis: number, toSemis: number, seconds: number): void {
  for (const { voice, note, end } of g.live) {
    if (end <= now || note.fixedHz !== undefined) continue;
    ramp(voice.osc.frequency, now, noteHz(note, fromSemis), noteHz(note, toSemis), seconds, true);
  }
}

/** Schedule one note at `start`, pitched for `semis` (the band offset at that moment). */
export function playNote(g: MusicGraph, note: MusicNote, start: number, semis: number): void {
  const end = start + note.duration;
  const sustained = note.layer === 'pad';
  try {
    const voice = startVoice(g.ctx, g.layers[note.layer], {
      wave: note.wave,
      freq: noteHz(note, semis),
      peak: note.peak,
      start,
      end,
      attack: sustained ? 0.25 : undefined,
      holdUntil: sustained ? end - 0.4 : undefined,
    });
    const live: LiveVoice = { voice, note, end };
    g.live.push(live);
    voice.osc.onended = () => {
      voice.osc.onended = null;
      g.live = g.live.filter((v) => v !== live);
      releaseNodes(voice);
    };
  } catch {
    // One lost note is inaudible; never let it reach the game.
  }
}

/** Forget voices that ended (a mocked context never fires onended). */
export function pruneLive(g: MusicGraph, now: number): void {
  const keep: LiveVoice[] = [];
  for (const v of g.live) {
    if (v.end + 0.1 < now) releaseNodes(v.voice);
    else keep.push(v);
  }
  g.live = keep;
}

export function disposeMusicGraph(g: MusicGraph): void {
  for (const { voice } of g.live) {
    voice.osc.onended = null;
    try {
      voice.osc.stop(0);
    } catch {
      // Already stopped.
    }
    releaseNodes(voice);
  }
  g.live = [];
  try {
    g.filter.disconnect();
    g.duck.disconnect();
    for (const id of MUSIC_LAYERS) g.layers[id].disconnect();
  } catch {
    // Already disconnected.
  }
}
