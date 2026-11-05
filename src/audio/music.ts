// Adaptive music: one loop whose pitch, brightness and layers follow the player's band.
// Owner: audio-designer. Reads the simulation, never changes it; Phaser-independent.
//
// The scene calls `music.update(frame)` once per rendered frame. Before the first gesture
// (engine not running) update does nothing and never throws. Spec: features/adaptive-audio.md.

import type { Band, SimEvent } from '../core/types';
import type { AudioEngine } from './engine';
import {
  buildMusicGraph,
  disposeMusicGraph,
  glideCutoff,
  glideDuck,
  glideLayers,
  glidePitch,
  playNote,
  pruneLive,
  type MusicGraph,
} from './musicGraph';
import {
  DARK_CUTOFF_HZ,
  DEATH_GLIDE_SECONDS,
  GLIDE_SECONDS,
  LOOP_STEPS,
  SNAP_SECONDS,
  STEP_SECONDS,
  WIN_FADE_SECONDS,
  bandTarget,
  drivingBand,
  fromLog2,
  glideValue,
  notesAt,
  retarget,
  steadyGlide,
  toLog2,
  type BodyBand,
  type Glide,
  type MusicLayerId,
} from './musicSpec';

const LOOKAHEAD_SECONDS = 0.2;
const STALE_SECONDS = 0.5;
const START_DELAY_SECONDS = 0.05;

export type MusicMode = 'play' | 'dead' | 'won';

export interface MusicFrame {
  /** Each body's band and home flag, runner first. */
  readonly bodies: readonly BodyBand[];
  /** This step's sim events (only `airDrag`, `died`, `won`, `restart` matter here). */
  readonly events?: readonly Pick<SimEvent, 'type'>[];
  readonly paused?: boolean;
}

/** What the music is doing right now, for tests and the F3 debug text. */
export interface MusicSnapshot {
  readonly running: boolean;
  readonly mode: MusicMode;
  readonly band: Band;
  readonly semitones: number;
  readonly cutoffHz: number;
  readonly layers: readonly MusicLayerId[];
  readonly ducked: boolean;
}

export interface Music {
  update(frame: MusicFrame): void;
  /** New attempt: back to play mode (the scene may call this instead of sending `restart`). */
  reset(): void;
  snapshot(): MusicSnapshot;
  dispose(): void;
}

type MusicEngine = Pick<AudioEngine, 'state' | 'getBuses'>;

interface Targets {
  readonly band: Band;
  readonly semitones: number;
  readonly cutoffHz: number;
  readonly layers: ReadonlySet<MusicLayerId>;
  readonly ducked: boolean;
}

export function createMusic(engine: MusicEngine): Music {
  let graph: MusicGraph | null = null;
  let disabled = false;
  let mode: MusicMode = 'play';
  let pitch: Glide = steadyGlide(0);
  let cutoff: Glide = steadyGlide(toLog2(DARK_CUTOFF_HZ));
  let current: Targets | null = null;
  let nextTime: number | null = null;
  let stepIndex = 0;

  /** The targets the music should be heading for this frame. */
  function desired(frame: MusicFrame, held: Targets | null): Targets {
    const ducked = frame.paused === true;
    if (mode === 'dead') return targetsOf(0, ducked);
    if (mode === 'won' && held) return { ...held, cutoffHz: DARK_CUTOFF_HZ, ducked };
    return targetsOf(drivingBand(frame.bodies), ducked);
  }

  function targetsOf(band: Band, ducked: boolean): Targets {
    const b = bandTarget(band);
    return {
      band,
      semitones: b.semitones,
      cutoffHz: ducked ? Math.min(b.cutoffHz, DARK_CUTOFF_HZ) : b.cutoffHz,
      layers: new Set(b.layers),
      ducked,
    };
  }

  function applyMode(events: MusicFrame['events']): boolean {
    let airDrag = false;
    for (const e of events ?? []) {
      if (e.type === 'restart') mode = 'play';
      else if (e.type === 'won') mode = 'won';
      else if (e.type === 'died' && mode !== 'won') mode = 'dead';
      else if (e.type === 'airDrag') airDrag = true;
    }
    return airDrag;
  }

  function glideSeconds(next: Targets, prev: Targets, airDrag: boolean): number {
    if (mode === 'won') return WIN_FADE_SECONDS;
    if (mode === 'dead') return DEATH_GLIDE_SECONDS;
    return airDrag && next.band < prev.band ? SNAP_SECONDS : GLIDE_SECONDS;
  }

  function differs(a: Targets, b: Targets): boolean {
    return a.band !== b.band || a.semitones !== b.semitones || a.cutoffHz !== b.cutoffHz || a.ducked !== b.ducked || !sameLayers(a.layers, b.layers);
  }

  function sameLayers(a: ReadonlySet<MusicLayerId>, b: ReadonlySet<MusicLayerId>): boolean {
    return a.size === b.size && [...a].every((l) => b.has(l));
  }

  /** Start moving to `next`; the first call jumps straight there (the loop starts on target). */
  function retargetTo(g: MusicGraph, now: number, next: Targets, airDrag: boolean): void {
    const prev = current;
    if (!prev) {
      pitch = steadyGlide(next.semitones);
      cutoff = steadyGlide(toLog2(next.cutoffHz));
      glideCutoff(g, now, next.cutoffHz, next.cutoffHz, 0);
      glideLayers(g, now, next.layers, next.layers, 0);
      glideDuck(g, now, next.ducked, 0);
      current = next;
      return;
    }
    const secs = glideSeconds(next, prev, airDrag);
    if (next.semitones !== prev.semitones) {
      const from = glideValue(pitch, now);
      glidePitch(g, now, from, next.semitones, secs);
      pitch = retarget(pitch, now, next.semitones, secs);
    }
    if (next.cutoffHz !== prev.cutoffHz) {
      const fromHz = fromLog2(glideValue(cutoff, now));
      glideCutoff(g, now, fromHz, next.cutoffHz, secs);
      cutoff = retarget(cutoff, now, toLog2(next.cutoffHz), secs);
    }
    if (!sameLayers(next.layers, prev.layers)) glideLayers(g, now, prev.layers, next.layers, secs);
    if (next.ducked !== prev.ducked) glideDuck(g, now, next.ducked, GLIDE_SECONDS);
    current = next;
  }

  function scheduleNotes(g: MusicGraph, now: number): void {
    if (nextTime === null || nextTime < now - STALE_SECONDS) {
      nextTime = now + START_DELAY_SECONDS;
      stepIndex = 0;
    }
    pruneLive(g, now);
    const layers = current?.layers;
    while (nextTime < now + LOOKAHEAD_SECONDS) {
      const semis = glideValue(pitch, nextTime);
      for (const note of notesAt(stepIndex)) {
        if (layers?.has(note.layer)) playNote(g, note, nextTime + note.delay, semis);
      }
      nextTime += STEP_SECONDS;
      stepIndex = (stepIndex + 1) % LOOP_STEPS;
    }
  }

  function ensureGraph(): MusicGraph | null {
    if (graph || disabled) return graph;
    const buses = engine.getBuses();
    if (!buses) return null;
    graph = buildMusicGraph(buses.context, buses.music);
    if (!graph) disabled = true;
    return graph;
  }

  function update(frame: MusicFrame): void {
    try {
      if (engine.state !== 'running') return;
      const g = ensureGraph();
      if (!g) return;
      const airDrag = applyMode(frame.events);
      const now = g.ctx.currentTime;
      const next = desired(frame, current);
      if (!current || differs(next, current)) retargetTo(g, now, next, airDrag);
      scheduleNotes(g, now);
    } catch {
      // Music is decoration: a broken graph degrades to silence, never to an exception.
    }
  }

  function snapshot(): MusicSnapshot {
    const now = graph?.ctx.currentTime ?? 0;
    return {
      running: graph !== null && current !== null,
      mode,
      band: current?.band ?? 0,
      semitones: glideValue(pitch, now),
      cutoffHz: fromLog2(glideValue(cutoff, now)),
      layers: current ? [...current.layers] : [],
      ducked: current?.ducked ?? false,
    };
  }

  return {
    update,
    reset: () => {
      mode = 'play';
    },
    snapshot,
    dispose: () => {
      if (graph) disposeMusicGraph(graph);
      graph = null;
      current = null;
      disabled = true;
    },
  };
}
