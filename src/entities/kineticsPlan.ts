/**
 * The pure plan behind `KineticsView` (slabs, tracks, emitters, shots, shimmer): where every kinetic
 * piece is at a render instant, as a function of `level` + `prev` + `state` + `alpha`. Positions come
 * from the [motion] functions (`moverOffset`, `shotsAt`, `nextShotIn`) at `prev.step` and `state.step`
 * and are blended like the bodies are (`renderBodyPosition`): only across two consecutive playing steps.
 * Phaser-free, so it runs in Node tests. Owner: gameplay-engineer [scene].
 */
import { BAND_COLORS, kineticStep, moverCorners, moverOffset, nextShotIn, shotsAt, sweepFront } from '../core';
import type { Band, ColoredBand, Emitter, KinDir, Level, Mover, SimState } from '../core/types';
import { kineticFrameNames, slabSegments, type BoltKind, type SlabKind } from '../fx';
import { lerp, renderBodyPosition } from './interpolation';
import { twinLaneTest } from './tandemView';

export interface PlanOptions {
  readonly tileSize: number;
  /** Steps of tell glow before a shot (tuning `emitterTellMs` as steps). */
  readonly tellSteps: number;
  readonly bodyWidthTiles: number;
  readonly bodyHeightTiles: number;
  /** Shot box side in tiles (the bolt sprite size over the tile size). */
  readonly shotSizeTiles: number;
}

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Which two kinetic-clock steps (`kineticStep`) to blend and how far (0..1). */
export interface RenderTime {
  readonly t0: number;
  readonly t1: number;
  readonly a: number;
}

const NAMES = kineticFrameNames();

export function renderTime(prev: SimState, state: SimState, alpha: number): RenderTime {
  const [k0, k1] = [kineticStep(prev), kineticStep(state)];
  const consecutive = prev.status === 'playing' && state.status === 'playing' && k1 === k0 + 1;
  return consecutive ? { t0: k0, t1: k1, a: alpha } : { t0: k1, t1: k1, a: 0 };
}

export const slabKind = (m: Mover): SlabKind => (m.solid.kind === 'safe' ? 'safe' : (BAND_COLORS[m.solid.band] as SlabKind));

export function boltKind(band: Band | null): BoltKind {
  return band === null ? 'grey' : (BAND_COLORS[band] as BoltKind);
}

/** Does the slab hold a body now? Safe always; coloured on a band match or the grace colour (as a floor tile). */
export function slabHolds(m: Mover, body: { readonly band: Band; readonly graceBand: ColoredBand | null }): boolean {
  return m.solid.kind === 'safe' || m.solid.band === body.band || m.solid.band === body.graceBand;
}

/** The body whose colour decides a slab: the twin in its lane (Tandem), else the runner. */
function laneBody(level: Level, state: SimState, row: number) {
  const inTwin = twinLaneTest(level)?.(row) === true;
  return inTwin && state.twin !== null ? state.twin : state.player;
}

// --- slabs -----------------------------------------------------------------

export interface SlabPlan {
  readonly id: number;
  /** Top-left, px, unrounded. */
  readonly x: number;
  readonly y: number;
  readonly frames: readonly string[];
  readonly holds: boolean;
  /** Direction of travel on this step, or null while it waits (or the run is frozen). */
  readonly chevron: KinDir | null;
}

function travelDir(m: Mover, state: SimState): KinDir | null {
  if (state.status !== 'playing') return null;
  const k = kineticStep(state);
  const a = moverOffset(m, k);
  const b = moverOffset(m, k + 1);
  if (b.x !== a.x) return b.x > a.x ? 'r' : 'l';
  if (b.y !== a.y) return b.y > a.y ? 'd' : 'u';
  return null;
}

export function planSlab(level: Level, m: Mover, id: number, prev: SimState, state: SimState, alpha: number, ts: number): SlabPlan {
  const { t0, t1, a } = renderTime(prev, state, alpha);
  const o0 = moverOffset(m, t0);
  const o1 = moverOffset(m, t1);
  const holds = slabHolds(m, laneBody(level, state, m.origin.row));
  const kind = slabKind(m);
  return {
    id,
    x: (m.origin.col + lerp(o0.x, o1.x, a)) * ts,
    y: (m.origin.row + lerp(o0.y, o1.y, a)) * ts,
    frames: slabSegments(m.width).map((seg) => NAMES.slab(kind, holds ? 'solid' : 'ghost', seg)),
    holds,
    chevron: travelDir(m, state),
  };
}

// --- tracks and swept cells --------------------------------------------------

type Side = 'n' | 'e' | 's' | 'w';
const SIDE_OF: Readonly<Record<KinDir, readonly [Side, Side]>> = { r: ['e', 'w'], l: ['w', 'e'], d: ['s', 'n'], u: ['n', 's'] };
const STEP_OF: Readonly<Record<KinDir, Pt>> = { r: { x: 1, y: 0 }, l: { x: -1, y: 0 }, d: { x: 0, y: 1 }, u: { x: 0, y: -1 } };
/** A path end: the bar sits opposite the one connected side. */
const STOP_FRAME: Readonly<Record<Side, string>> = { e: 'stop/l', w: 'stop/r', s: 'stop/u', n: 'stop/d' };

export interface TrackCell {
  readonly col: number;
  readonly row: number;
  readonly frames: readonly string[];
}

function cellFrames(sides: ReadonlySet<Side>): string[] {
  if (sides.size === 1) return [`track/${STOP_FRAME[[...sides][0] as Side]}`];
  if (sides.size > 2) return ['track/h', 'track/v']; // a junction (a path that crosses itself)
  if (sides.has('e') && sides.has('w')) return ['track/h'];
  if (sides.has('n') && sides.has('s')) return ['track/v'];
  return [`track/${sides.has('n') ? 'n' : 's'}${sides.has('e') ? 'e' : 'w'}`];
}

/** Every unit leg of the path, walking the slab's centre cell: the sides each visited cell connects. */
function walkPath(m: Mover): Map<string, { readonly at: Pt; readonly sides: Set<Side> }> {
  const cells = new Map<string, { readonly at: Pt; readonly sides: Set<Side> }>();
  const touch = (p: Pt, side: Side): void => {
    const k = `${p.x},${p.y}`;
    const cell = cells.get(k) ?? { at: p, sides: new Set<Side>() };
    cell.sides.add(side);
    cells.set(k, cell);
  };
  let pos: Pt = { x: Math.floor((m.width - 1) / 2), y: 0 };
  for (const token of m.path) {
    if (token.kind !== 'move') continue;
    const [out, back] = SIDE_OF[token.dir];
    const d = STEP_OF[token.dir];
    for (let i = 0; i < token.tiles; i++) {
      touch(pos, out);
      pos = { x: pos.x + d.x, y: pos.y + d.y };
      touch(pos, back);
    }
  }
  return cells;
}

/** The dotted track: one entry per path cell, `track/<h|v|corner|stop>` frames, in grid cells. */
export function trackCells(m: Mover): readonly TrackCell[] {
  return [...walkPath(m).values()].map(({ at, sides }) => ({ col: m.origin.col + at.x, row: m.origin.row + at.y, frames: cellFrames(sides) }));
}

/** Cell indices (row * width + col) a slab covers anywhere on its path. */
export function sweptCells(m: Mover, levelWidth: number): ReadonlySet<number> {
  const out = new Set<number>();
  const pts = moverCorners(m);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as Pt;
    const b = (pts[i + 1] ?? a) as Pt;
    const [c0, c1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
    const [r0, r1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c < c1 + m.width; c++) out.add((m.origin.row + r) * levelWidth + m.origin.col + c);
    }
  }
  return out;
}

// --- emitters, shots, shimmer -------------------------------------------------

/** Tell steps for one emitter: the configured glow, never more than half the period so it still blinks. */
export function tellLength(e: Emitter, tellSteps: number): number {
  return Math.min(tellSteps, Math.floor(e.period / 2));
}

/** The glow before a shot: on for the `tellLength` steps ending on the step the shot leaves; `glow` rises 0..1. */
export function emitterTell(e: Emitter, t: number, tellSteps: number): { readonly on: boolean; readonly glow: number } {
  const len = tellLength(e, tellSteps);
  const n = nextShotIn(e, t);
  return n < len ? { on: true, glow: (len - n) / len } : { on: false, glow: 0 };
}

export interface EmitterPlan {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly frame: string;
  readonly tell: boolean;
  readonly glow: number;
  readonly kind: BoltKind;
}

export function planEmitter(e: Emitter, id: number, state: SimState, o: PlanOptions): EmitterPlan {
  const kind = boltKind(e.band);
  const { on, glow } = emitterTell(e, kineticStep(state), o.tellSteps);
  return {
    id,
    x: e.cell.col * o.tileSize,
    y: e.cell.row * o.tileSize,
    frame: NAMES.emitter(e.dir, kind, on ? 'tell' : 'idle'),
    tell: on,
    glow,
    kind,
  };
}

export interface ShotPlan {
  /** `<emitter index>:<firedAt>`: the same shot keeps its key from frame to frame. */
  readonly key: string;
  readonly emitter: number;
  /** Centre, blended. Tiles from `planShots`; px in `KineticsPlan.shots`. */
  readonly x: number;
  readonly y: number;
  readonly kind: BoltKind;
}

export function planShots(e: Emitter, id: number, t: RenderTime): ShotPlan[] {
  const before = new Map(shotsAt(e, t.t0).map((s) => [s.firedAt, s]));
  return shotsAt(e, t.t1).map((s) => {
    const p = before.get(s.firedAt) ?? s; // a shot fired this step has nothing earlier to blend from
    return { key: `${id}:${s.firedAt}`, emitter: id, x: lerp(p.x, s.x, t.a), y: lerp(p.y, s.y, t.a), kind: boltKind(e.band) };
  });
}

export interface ShimmerPlan {
  readonly x: number;
  readonly y: number;
  readonly kind: BoltKind;
}

interface BodyBox {
  readonly x: number;
  readonly y: number;
  readonly band: Band;
}

function bodiesOf(prev: SimState, state: SimState, alpha: number): BodyBox[] {
  const out: BodyBox[] = [];
  [state.player, state.twin].forEach((b, i) => {
    const pos = b === null ? null : renderBodyPosition(prev, state, alpha, i as 0 | 1);
    if (b !== null && pos !== null) out.push({ ...pos, band: b.band });
  });
  return out;
}

const overlaps = (shot: Pt, size: number, body: BodyBox, o: PlanOptions): boolean =>
  Math.abs(shot.x - body.x) < (size + o.bodyWidthTiles) / 2 && shot.y + size / 2 > body.y - o.bodyHeightTiles && shot.y - size / 2 < body.y;

/** A shot inside a body it cannot hit shimmers through it (projectiles.md "Readability"). */
export function planShimmers(emitters: readonly Emitter[], shots: readonly ShotPlan[], bodies: readonly BodyBox[], o: PlanOptions): ShimmerPlan[] {
  const out: ShimmerPlan[] = [];
  for (const s of shots) {
    const band = (emitters[s.emitter] as Emitter).band;
    for (const b of bodies) {
      if (band === null || band === b.band || !overlaps(s, o.shotSizeTiles, b, o)) continue;
      out.push({ x: s.x * o.tileSize, y: s.y * o.tileSize, kind: s.kind });
    }
  }
  return out;
}

// --- the whole frame ---------------------------------------------------------

export interface KineticsPlan {
  readonly slabs: readonly SlabPlan[];
  readonly emitters: readonly EmitterPlan[];
  /** Shot centres in px, unrounded. */
  readonly shots: readonly ShotPlan[];
  readonly shimmers: readonly ShimmerPlan[];
}

export function planKinetics(level: Level, prev: SimState, state: SimState, alpha: number, o: PlanOptions): KineticsPlan {
  const emitters = level.emitters ?? [];
  const t = renderTime(prev, state, alpha);
  const shots = emitters.flatMap((e, i) => planShots(e, i, t));
  return {
    slabs: (level.movers ?? []).map((m, i) => planSlab(level, m, i, prev, state, alpha, o.tileSize)),
    emitters: emitters.map((e, i) => planEmitter(e, i, state, o)),
    shots: shots.map((s) => ({ ...s, x: s.x * o.tileSize, y: s.y * o.tileSize })),
    shimmers: planShimmers(emitters, shots, bodiesOf(prev, state, alpha), o),
  };
}

/** Exact state at `state.step` for the QA hook: tiles, no blending. */
export interface KineticsSnapshot {
  /** The kinetic clock the pieces below are evaluated at. */
  readonly step: number;
  readonly movers: readonly { readonly x: number; readonly y: number; readonly holds: boolean }[];
  readonly emitters: readonly { readonly tell: boolean }[];
  readonly shots: readonly { readonly emitter: number; readonly firedAt: number; readonly x: number; readonly y: number }[];
  /** Sweep front x in tiles at the kinetic clock, or null when the level has no sweep. */
  readonly sweepFront: number | null;
}

export function kineticsSnapshot(level: Level, state: SimState, tellSteps: number): KineticsSnapshot {
  const emitters = level.emitters ?? [];
  const k = kineticStep(state);
  return {
    step: k,
    sweepFront: level.sweep === undefined ? null : sweepFront(level.sweep, k, level.width),
    movers: (level.movers ?? []).map((m) => {
      const off = moverOffset(m, k);
      return { x: m.origin.col + off.x, y: m.origin.row + off.y, holds: slabHolds(m, laneBody(level, state, m.origin.row)) };
    }),
    emitters: emitters.map((e) => ({ tell: emitterTell(e, k, tellSteps).on })),
    shots: emitters.flatMap((e, i) => shotsAt(e, k).map((s) => ({ emitter: i, firedAt: s.firedAt, x: s.x, y: s.y }))),
  };
}
