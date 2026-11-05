// Audio engine wrapper: lazy AudioContext, master/music/SFX buses, mute, tone helper.
// Owner: audio-designer. Phaser-independent; reads nothing from the simulation.
//
// Rules this file keeps:
//  - No AudioContext is created before unlock() (first user gesture), so the itch.io
//    iframe autoplay policy is never tripped and nothing throws in Node/Vitest.
//  - Every public call is safe at any time. Missing Web Audio, a rejected resume() or a
//    failing node graph degrades to silence, never to an exception.
//  - Settings (volumes, mute) set before the context exists are stored and applied on creation.

import {
  buildGraph,
  clamp01,
  isPositive,
  releaseNodes,
  setGain,
  startVoice,
  type Graph,
  type Voice,
} from './toneVoice';
import type { AudioBuses, AudioContextLike, EventTargetLike } from './webAudioTypes';

export type {
  AudioBuses,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  BiquadFilterNodeLike,
  EventTargetLike,
  GainNodeLike,
  OscillatorNodeLike,
} from './webAudioTypes';

// ---- Public types ----

export type AudioState = 'locked' | 'running' | 'unsupported' | 'closed';
export type BusName = 'music' | 'sfx';
export type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface ToneOptions {
  /** Start frequency in Hz (> 0). */
  readonly freq: number;
  /** Optional end frequency in Hz; the pitch glides there over `duration`. */
  readonly endFreq?: number;
  /** Seconds (> 0, capped at MAX_TONE_SECONDS). */
  readonly duration: number;
  readonly type?: WaveType;
  /** Peak level 0..1 before the bus. Default is deliberately modest. */
  readonly gain?: number;
  /** Seconds from now before the tone starts. */
  readonly delay?: number;
  readonly bus?: BusName;
}

export interface AudioSettingsState {
  readonly master: number;
  readonly music: number;
  readonly sfx: number;
  readonly muted: boolean;
}

/** Shape of the save-file settings (`src/save/schema.ts`); `muted` is optional. */
export interface SaveAudioSettings {
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted?: boolean;
}

export interface AudioEngine {
  readonly state: AudioState;
  /** Create (first call) and resume the context. Call from a user gesture. Never rejects. */
  unlock(): Promise<void>;
  /**
   * Unlock on the first key press or click. Listeners stay until the context is actually
   * running, because a bare Shift press does not count as a gesture in some browsers.
   * Returns a disposer. Pass `null` for no target; omit to use `window`.
   */
  installGestureUnlock(target?: EventTargetLike | null): () => void;
  setMasterVolume(volume: number): void;
  setMusicVolume(volume: number): void;
  setSfxVolume(volume: number): void;
  setMuted(muted: boolean): void;
  applySettings(settings: SaveAudioSettings): void;
  getSettings(): AudioSettingsState;
  /** Play a short oscillator blip. Returns whether it was scheduled. */
  tone(options: ToneOptions): boolean;
  activeVoices(): number;
  /** Buses for the adaptive music lane; null until the context exists. */
  getBuses(): AudioBuses | null;
  dispose(): void;
}

export interface AudioEngineOptions {
  /** Injected in tests. Return null when Web Audio is unavailable. */
  readonly contextFactory?: () => AudioContextLike | null;
}

// ---- Constants ----

export const MAX_VOICES = 24;
export const MAX_TONE_SECONDS = 4;
const MAX_DELAY_SECONDS = 5;
const DEFAULT_TONE_GAIN = 0.25;
const GESTURE_EVENTS = ['pointerdown', 'mousedown', 'touchend', 'keydown', 'keyup'] as const;
const WAVES: readonly WaveType[] = ['sine', 'square', 'sawtooth', 'triangle'];

const DEFAULTS: AudioSettingsState = { master: 0.8, music: 0.6, sfx: 0.8, muted: false };

// ---- Helpers ----

function defaultContextFactory(): AudioContextLike | null {
  const g = globalThis as unknown as {
    AudioContext?: new () => AudioContextLike;
    webkitAudioContext?: new () => AudioContextLike;
  };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

function defaultTarget(): EventTargetLike | null {
  const g = globalThis as unknown as { window?: EventTargetLike; document?: EventTargetLike };
  return g.window ?? g.document ?? null;
}

// ---- Engine ----

export function createAudioEngine(options: AudioEngineOptions = {}): AudioEngine {
  const factory = options.contextFactory ?? defaultContextFactory;
  let settings: AudioSettingsState = DEFAULTS;
  let graph: Graph | null = null;
  let unsupported = false;
  let closed = false;
  let voices = 0;
  /** SFX voices, oldest first. At the voice cap the oldest is stopped, never a music voice. */
  const sfxVoices: Voice[] = [];
  let removeListeners: (() => void) | null = null;

  const effectiveMaster = (): number => (settings.muted ? 0 : settings.master);

  function applyGains(): void {
    if (!graph) return;
    try {
      setGain(graph.ctx, graph.master, effectiveMaster());
      setGain(graph.ctx, graph.music, settings.music);
      setGain(graph.ctx, graph.sfx, settings.sfx);
    } catch {
      // A broken graph must never reach the caller; the game keeps running silently.
    }
  }

  function update(patch: Partial<AudioSettingsState>): void {
    if (closed) return;
    settings = { ...settings, ...patch };
    applyGains();
  }

  function ensureGraph(): Graph | null {
    if (graph || unsupported || closed) return graph;
    try {
      const ctx = factory();
      if (!ctx) {
        unsupported = true;
        return null;
      }
      graph = buildGraph(ctx);
      applyGains();
    } catch {
      graph = null;
      unsupported = true;
    }
    return graph;
  }

  async function unlock(): Promise<void> {
    const g = ensureGraph();
    if (!g || g.ctx.state === 'running') return;
    try {
      await g.ctx.resume();
    } catch {
      // Autoplay policy refused (not a real gesture). Stay locked; the next gesture retries.
    }
  }

  function getState(): AudioState {
    if (closed) return 'closed';
    if (unsupported) return 'unsupported';
    return graph?.ctx.state === 'running' ? 'running' : 'locked';
  }

  function installGestureUnlock(target?: EventTargetLike | null): () => void {
    removeListeners?.();
    removeListeners = null;
    const t = target === undefined ? defaultTarget() : target;
    const s = getState();
    if (!t || s === 'running' || s === 'unsupported' || s === 'closed') return () => {};

    const remove = (): void => {
      for (const type of GESTURE_EVENTS) t.removeEventListener(type, onGesture, true);
      if (removeListeners === remove) removeListeners = null;
    };
    function onGesture(): void {
      void unlock().then(() => {
        if (getState() !== 'locked') remove();
      });
    }
    for (const type of GESTURE_EVENTS) t.addEventListener(type, onGesture, true);
    removeListeners = remove;
    return remove;
  }

  function audible(bus: BusName): boolean {
    return !settings.muted && settings.master > 0 && settings[bus] > 0;
  }

  function releaseVoice(voice: Voice): void {
    const i = sfxVoices.findIndex((v) => v.osc === voice.osc);
    if (i >= 0) sfxVoices.splice(i, 1);
    releaseNodes(voice);
  }

  /** Cut the oldest SFX voice to make room. Returns false when no SFX voice is playing. */
  function stealOldestSfx(): boolean {
    const oldest = sfxVoices[0];
    if (!oldest) return false;
    oldest.osc.onended = null;
    try {
      oldest.osc.stop(0);
    } catch {
      // Never started or already stopped.
    }
    releaseVoice(oldest);
    voices = Math.max(0, voices - 1);
    return true;
  }

  function tone(opts: ToneOptions): boolean {
    const g = graph;
    if (!g || getState() !== 'running') return false;
    if (!isPositive(opts.freq) || !isPositive(opts.duration)) return false;
    const busName: BusName = opts.bus ?? 'sfx';
    if (!audible(busName)) return false;
    if (voices >= MAX_VOICES && !(busName === 'sfx' && stealOldestSfx())) return false;

    const duration = Math.min(opts.duration, MAX_TONE_SECONDS);
    const delay = typeof opts.delay === 'number' && Number.isFinite(opts.delay) ? Math.min(MAX_DELAY_SECONDS, Math.max(0, opts.delay)) : 0;
    const start = g.ctx.currentTime + delay;
    let voice: Voice;
    try {
      voice = startVoice(g.ctx, busName === 'music' ? g.music : g.sfx, {
        wave: opts.type && WAVES.includes(opts.type) ? opts.type : 'square',
        freq: opts.freq,
        endFreq: opts.endFreq,
        peak: clamp01(opts.gain, DEFAULT_TONE_GAIN),
        start,
        end: start + duration,
      });
    } catch {
      return false; // startVoice released its nodes; nothing was counted.
    }
    // Count the voice only once it is really playing, so a failure above can never leak a slot.
    voices += 1;
    if (busName === 'sfx') sfxVoices.push(voice);
    voice.osc.onended = () => {
      voice.osc.onended = null;
      voices = Math.max(0, voices - 1);
      releaseVoice(voice);
    };
    return true;
  }

  return {
    get state(): AudioState {
      return getState();
    },
    unlock,
    installGestureUnlock,
    setMasterVolume: (v) => update({ master: clamp01(v, settings.master) }),
    setMusicVolume: (v) => update({ music: clamp01(v, settings.music) }),
    setSfxVolume: (v) => update({ sfx: clamp01(v, settings.sfx) }),
    setMuted: (muted) => update({ muted: muted === true }),
    applySettings: (s) =>
      update({
        music: clamp01(s.musicVolume, settings.music),
        sfx: clamp01(s.sfxVolume, settings.sfx),
        muted: typeof s.muted === 'boolean' ? s.muted : settings.muted,
      }),
    getSettings: () => settings,
    tone,
    activeVoices: () => voices,
    getBuses: () => (graph ? { context: graph.ctx, master: graph.master, music: graph.music, sfx: graph.sfx } : null),
    dispose: () => {
      removeListeners?.();
      removeListeners = null;
      closed = true;
      const g = graph;
      graph = null;
      voices = 0;
      sfxVoices.length = 0;
      if (g) void g.ctx.close().catch(() => {});
    },
  };
}
