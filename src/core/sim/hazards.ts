/**
 * Bolts (projectiles.md, expansion-approach.md section 3): the phase 14 hit test.
 * Shots are a pure function of the run clock (`shotsAt`), ignore tiles and have
 * no state. A body is hit when its box after phases 7-8 strictly overlaps a
 * live shot's box at t+1 and the shot can hit the band the body had at the
 * START of the step (null = grey hits all, 0 = white, 1-4 that band).
 */
import { shotsAt, sweepFront } from '../motion';
import { SIM_EPSILON, type Band, type Level, type PlayerState, type SimParams } from '../types';
import { boxAt } from './geometry';

/** What phase 14 needs to judge hits: the run step after this step and each body's band at the start. */
export interface HitCtx {
  readonly t1: number;
  readonly startBands: readonly [Band, Band];
}

/** True if body `id` (box after phases 7-8) is hit by a bolt alive at ctx.t1. Home bodies are never hit. */
export function bodyHit(level: Level, params: SimParams, p: PlayerState, id: 0 | 1, ctx: HitCtx): boolean {
  const emitters = level.emitters;
  if (!emitters || p.home) return false;
  const box = boxAt(p.x, p.y, params);
  const band = ctx.startBands[id];
  const half = params.projectileSize / 2;
  return emitters.some(
    (e) =>
      (e.band === null || e.band === band) &&
      shotsAt(e, ctx.t1).some(
        (s) =>
          box.left < s.x + half - SIM_EPSILON &&
          box.right > s.x - half + SIM_EPSILON &&
          box.top < s.y + half - SIM_EPSILON &&
          box.bottom > s.y - half + SIM_EPSILON,
      ),
  );
}

/** True if the sweep front has reached body `p`'s centre at t1 (kinetics.ts `Sweep`). Air does not save you; home bodies are never caught. */
export function bodyCaught(level: Level, p: PlayerState, ctx: HitCtx): boolean {
  const sw = level.sweep;
  return sw !== undefined && !p.home && sweepFront(sw, ctx.t1, level.width) >= p.x;
}
