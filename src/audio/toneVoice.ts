// One oscillator voice with an attack/decay envelope, and the bus graph. Owner: audio-designer.
// Pure plumbing around the structural Web Audio types; no state of its own.

import type { AudioContextLike, GainNodeLike, OscillatorNodeLike } from './webAudioTypes';

export const ATTACK_SECONDS = 0.005;
export const SILENCE = 0.0001;
const SMOOTHING_SECONDS = 0.01;

export interface Graph {
  readonly ctx: AudioContextLike;
  readonly master: GainNodeLike;
  readonly music: GainNodeLike;
  readonly sfx: GainNodeLike;
}

export function buildGraph(ctx: AudioContextLike): Graph {
  const master = ctx.createGain();
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  master.connect(ctx.destination);
  music.connect(master);
  sfx.connect(master);
  return { ctx, master, music, sfx };
}

export function setGain(ctx: AudioContextLike, node: GainNodeLike, value: number): void {
  const now = ctx.currentTime;
  node.gain.cancelScheduledValues(now);
  node.gain.setTargetAtTime(value, now, SMOOTHING_SECONDS);
}

export function clamp01(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export interface VoiceSpec {
  readonly wave: string;
  readonly freq: number;
  readonly endFreq?: number;
  readonly peak: number;
  readonly start: number;
  readonly end: number;
  /** Attack seconds (default 5 ms). */
  readonly attack?: number;
  /** Keep the peak until this time before decaying (sustained pads). Default: decay at once. */
  readonly holdUntil?: number;
}

export interface Voice {
  readonly osc: OscillatorNodeLike;
  readonly env: GainNodeLike;
}

/** Disconnect both nodes, ignoring "already disconnected". */
export function releaseNodes(voice: Voice): void {
  try {
    voice.osc.disconnect();
    voice.env.disconnect();
  } catch {
    // Already disconnected.
  }
}

/**
 * Build, connect and start one voice into `destination`. On any failure the partly built
 * nodes are released and the error is rethrown, so the caller can count a voice only after
 * this returns (no leaked count).
 */
export function startVoice(ctx: AudioContextLike, destination: GainNodeLike, spec: VoiceSpec): Voice {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const voice: Voice = { osc, env };
  try {
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(spec.freq, spec.start);
    if (isPositive(spec.endFreq)) osc.frequency.exponentialRampToValueAtTime(spec.endFreq, spec.end);
    env.gain.setValueAtTime(SILENCE, spec.start);
    const peak = Math.max(spec.peak, SILENCE);
    const attackEnd = spec.start + Math.min(spec.attack ?? ATTACK_SECONDS, (spec.end - spec.start) / 2);
    env.gain.linearRampToValueAtTime(peak, attackEnd);
    if (spec.holdUntil !== undefined && spec.holdUntil > attackEnd) env.gain.linearRampToValueAtTime(peak, spec.holdUntil);
    env.gain.exponentialRampToValueAtTime(SILENCE, spec.end);
    osc.connect(env);
    env.connect(destination);
    osc.start(spec.start);
    osc.stop(spec.end + ATTACK_SECONDS);
  } catch (error) {
    releaseNodes(voice);
    throw error;
  }
  return voice;
}
