/**
 * Phases 9-11: air drag (via motion), band and gear-follows-band, landing
 * with the shift buffer (GDD §4.9, air-drag.md).
 */
import { airDrag, bandForSpeed } from '../motion';
import type { Gear } from '../types';
import { clampGear, emit, inAirThisStep, withPlayer, type StepCtx, type Work } from './work';

/** Phase 9: add |dx actually moved|, then at most one stepwise drop. */
export function dragPhase(w: Work, ctx: StepCtx): Work {
  if (!inAirThisStep(w, ctx)) return w;
  const p = w.player;
  const res = airDrag(p.vx, p.airDistance + Math.abs(w.dxMoved), ctx.params);
  const next = withPlayer(w, { vx: res.vx, airDistance: res.airDistance });
  if (!res.dropped) return next;
  const edges = ctx.params.colorBandEdges;
  return emit(next, { type: 'airDrag', from: bandForSpeed(Math.abs(p.vx), edges), to: bandForSpeed(Math.abs(res.vx), edges) });
}

/** Phase 10: band from |vx|; in the air the gear can only fall to the band (never below minGear). */
export function bandPhase(w: Work, ctx: StepCtx): Work {
  const p = w.player;
  const band = bandForSpeed(Math.abs(p.vx), ctx.params.colorBandEdges);
  const gear = inAirThisStep(w, ctx) ? (Math.max(ctx.params.minGear, Math.min(p.gear, band)) as Gear) : p.gear;
  const next = withPlayer(w, { band, gear });
  return band === ctx.startBand ? next : emit(next, { type: 'bandChange', from: ctx.startBand, to: band });
}

/** Phase 11: airborne at start, grounded now. Drag reset, shift buffer applied (clamped), coyote ended. */
export function landingPhase(w: Work, ctx: StepCtx): Work {
  if (ctx.startGrounded || !w.player.grounded) return w;
  const p = w.player;
  const net = p.shiftBufferSteps > 0 ? p.shiftBufferNet : 0;
  const gear = clampGear(p.gear + net, ctx.params);
  const cleared = withPlayer(w, { airDistance: 0, gear, shiftBufferNet: 0, shiftBufferSteps: 0, coyoteSteps: 0 });
  const shifted = gear === p.gear ? cleared : emit(cleared, { type: 'shift', from: p.gear, to: gear });
  return emit(shifted, { type: 'land' });
}
