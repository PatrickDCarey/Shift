/**
 * Moving slabs in the sim (moving-objects.md; expansion-approach.md Revision).
 * Slabs are TOP-ONLY: a floor that carries (phase 6b) and that a body lands on
 * or stands on (phase 8). No side or underside contact, no push, no crush, no
 * no-embed. Positions are `moverOffset(mover, t)` of the run clock; nothing is
 * stored in SimState. Levels without `movers` never reach this file's work.
 */
import { moverOffset } from '../motion';
import { SIM_EPSILON, type Level, type Mover, type PlayerState, type SimParams } from '../types';
import { sweepX, sweepY } from './collision';
import { gateFor, type Gate } from './gating';
import { withPlayer, type StepCtx, type Work } from './work';

/** One slab at one run step: its top face. */
export interface Slab {
  readonly index: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** The slab's top face at run step t. */
export function slabAt(m: Mover, index: number, t: number): Slab {
  const off = moverOffset(m, t);
  const left = m.origin.col + off.x;
  return { index, left, right: left + m.width, top: m.origin.row + off.y };
}

/** Solid for a body: safe always; coloured when the band matches or is the active grace colour (floors only). */
export function moverSolid(m: Mover, gate: Gate): boolean {
  if (m.solid.kind === 'safe') return true;
  return m.solid.band === gate.band || m.solid.band === gate.graceBand;
}

const overlapsX = (s: Slab, x: number, params: SimParams): boolean => {
  const half = params.playerWidth / 2;
  return x - half < s.right - SIM_EPSILON && x + half > s.left + SIM_EPSILON;
};

const nearTop = (s: Slab, y: number): boolean => Math.abs(y - s.top) <= SIM_EPSILON;

/** The lowest-index solid slab at step t that the feet at (x, y) stand on, or null. */
export function slabUnder(level: Level, params: SimParams, t: number, gate: Gate, x: number, y: number): Slab | null {
  const movers = level.movers ?? [];
  for (let i = 0; i < movers.length; i += 1) {
    const m = movers[i];
    if (!m || !moverSolid(m, gate)) continue;
    const s = slabAt(m, i, t);
    if (nearTop(s, y) && overlapsX(s, x, params)) return s;
  }
  return null;
}

const graceOf = (p: PlayerState) => (p.graceSteps > 0 ? p.graceBand : null);

/** Phase 6b: a grounded, non-jumping body on a slab moves with it (x swept against tiles, feet snapped). */
export function carryPhase(w: Work, ctx: StepCtx): Work {
  const movers = ctx.level.movers;
  if (!movers || !ctx.startGrounded || w.jumped) return w;
  const p = w.player;
  const gate = gateFor(ctx.level, ctx.params, p.x, p.y, ctx.startBand, graceOf(p));
  const now = slabUnder(ctx.level, ctx.params, ctx.t, gate, p.x, p.y);
  const m = now && movers[now.index];
  if (!now || !m) return w;
  const next = slabAt(m, now.index, ctx.t + 1);
  const dx = next.left - now.left;
  const dy = next.top - now.top;
  const x = dx === 0 ? p.x : sweepX(ctx.level, ctx.params, p.x, p.y, dx, gate).x;
  if (dy === 0) return withPlayer(w, { x });
  const res = sweepY(ctx.level, ctx.params, x, p.y, dy, gate);
  return withPlayer(w, { x, y: res.hit === null ? next.top : res.y });
}

/**
 * Phase 8 slab floor: the top (feet y) of the slab the body lands on or stands
 * on at t+1, or null. `y0` = feet before the vertical move, `y1` = after the
 * tile sweep. Landing is swept: feet at or above the top at t and at or below
 * the top at t+1. A jump this step or a ceiling bonk never lands.
 */
export function slabFloor(w: Work, ctx: StepCtx, gate: Gate, y0: number, y1: number, bonked: boolean): number | null {
  const movers = ctx.level.movers;
  if (!movers || w.jumped || bonked) return null;
  let best: number | null = null;
  movers.forEach((m, i) => {
    if (!moverSolid(m, gate)) return;
    const a = slabAt(m, i, ctx.t);
    const b = slabAt(m, i, ctx.t + 1);
    const swept = y0 <= a.top + SIM_EPSILON && y1 >= b.top - SIM_EPSILON;
    if ((swept || nearTop(b, y1)) && overlapsX(b, w.player.x, ctx.params) && (best === null || b.top < best)) best = b.top;
  });
  return best;
}

/** Coloured slabs under the feet at t or t+1 (indices ascending): what a walk-off or mismatch let go, for `fallThrough`. */
export function lettingGo(level: Level, params: SimParams, t: number, x: number, y: number): readonly number[] {
  const out: number[] = [];
  (level.movers ?? []).forEach((m, i) => {
    if (m.solid.kind !== 'colored') return;
    const held = [t, t + 1].some((u) => {
      const s = slabAt(m, i, u);
      return nearTop(s, y) && overlapsX(s, x, params);
    });
    if (held) out.push(i);
  });
  return out;
}
