/**
 * Which player sprite frame to draw. Pure: the frame comes from sim state (and,
 * for the short one-shot poses, from a render-frame age the scene counts), never
 * from wall-clock time, so a replay looks the same frame for frame
 * (docs/tech/adr-pixel-rendering.md "Animation frames come from sim state").
 *
 * Names come from `playerFrameName` (src/fx); the frames face right, `flipX` is
 * true when the body faces left. Owner: gameplay-engineer [scene].
 */
import { BAND_COLORS, SIM_EPSILON, type PlayerState } from '../core/types';
import { PLAYER_ANIMS, playerFrameName } from '../fx';

export type BodyName = 'runner' | 'twin';

/** Placeholder (requests.md 2026-11-13): run-cycle frames advanced per tile travelled. Not in tuning.json yet. */
export const RUN_FRAMES_PER_TILE = 3;

/** Render rate the one-shot poses are timed against (they are cosmetic and not part of the sim). */
const RENDER_HZ = 60;

/** One-shot poses started by sim events; `age` counts render frames since the event. */
export type TransientAnim = 'land' | 'jump' | 'shift';

export interface Transient {
  readonly anim: TransientAnim;
  readonly age: number;
}

export interface PlayerFrameOptions {
  /** A one-shot pose in progress, or none. Ignored while home or dead. */
  readonly transient?: Transient | null;
  /** Render frames since the run died; present only while the run is dead. */
  readonly deathAge?: number | null;
}

export interface PlayerFrame {
  readonly name: string;
  readonly flipX: boolean;
}

interface AnimInfo {
  readonly frames: number;
  readonly fps: number;
}

const ANIMS: ReadonlyMap<string, AnimInfo> = new Map(PLAYER_ANIMS.map((a) => [a.name, { frames: a.frames, fps: a.fps }]));

function animInfo(anim: string): AnimInfo {
  const info = ANIMS.get(anim);
  if (info === undefined) throw new Error(`unknown player animation: ${anim}`);
  return info;
}

function rawIndex(anim: string, age: number): number {
  return Math.floor((Math.max(0, age) * animInfo(anim).fps) / RENDER_HZ);
}

/** Frame index `age` render frames into `anim`, or null once a one-shot has finished. */
export function oneShotIndex(anim: string, age: number): number | null {
  const index = rawIndex(anim, age);
  return index < animInfo(anim).frames ? index : null;
}

/** Positive modulo, so a negative x never gives a negative frame. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function isSkidding(p: PlayerState): boolean {
  return p.grounded && p.moveDir !== 0 && Math.abs(p.vx) > SIM_EPSILON && Math.sign(p.vx) !== p.moveDir;
}

function runFrame(p: PlayerState): string {
  const anim = p.band >= 3 ? 'sprint' : 'run';
  // Multiplying by facing makes the cycle advance with the direction of travel.
  return `${anim}_${mod(Math.floor(p.x * p.facing * RUN_FRAMES_PER_TILE), animInfo(anim).frames)}`;
}

/** The `anim_n` part of the frame name. */
function baseFrame(p: PlayerState, opts: PlayerFrameOptions): string {
  if (opts.deathAge !== undefined && opts.deathAge !== null) {
    return `death_${Math.min(animInfo('death').frames - 1, rawIndex('death', opts.deathAge))}`;
  }
  if (p.home) return 'park_0';
  const t = opts.transient;
  if (t !== undefined && t !== null) {
    const n = oneShotIndex(t.anim, t.age);
    if (n !== null) return `${t.anim}_${n}`;
  }
  if (!p.grounded) return p.vy < 0 ? 'jump_1' : 'fall_0';
  if (isSkidding(p)) return 'skid_0';
  if (Math.abs(p.vx) <= SIM_EPSILON) return 'idle_0';
  return runFrame(p);
}

export function playerFrame(player: PlayerState, body: BodyName, opts: PlayerFrameOptions = {}): PlayerFrame {
  return {
    name: playerFrameName(body, BAND_COLORS[player.band], baseFrame(player, opts)),
    flipX: player.facing < 0,
  };
}
