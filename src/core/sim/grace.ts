/**
 * Phases 12-13: colour grace (GDD §4.8) and timer countdown (architecture.md §3.2).
 */
import type { ColoredBand } from '../types';
import { emit, withPlayer, type StepCtx, type Work } from './work';

/**
 * Phase 12. Leaving the ground clears grace. Grounded at start and now with
 * a band change from a coloured band starts (or replaces) grace; otherwise a
 * running grace counts down here (not in phase 13), clearing its colour at 0.
 */
export function gracePhase(w: Work, ctx: StepCtx): Work {
  const p = w.player;
  if (!p.grounded) return withPlayer(w, { graceSteps: 0, graceBand: null });
  const steps = ctx.params.colorGraceSteps;
  if (ctx.startGrounded && p.band !== ctx.startBand && ctx.startBand >= 1 && steps > 0) {
    const band = ctx.startBand as ColoredBand;
    return emit(withPlayer(w, { graceBand: band, graceSteps: steps }), { type: 'graceStart', body: ctx.body, band });
  }
  if (p.graceSteps === 0) return w;
  const graceSteps = p.graceSteps - 1;
  return withPlayer(w, { graceSteps, graceBand: graceSteps === 0 ? null : p.graceBand });
}

const tick = (n: number): number => (n > 0 ? n - 1 : 0);

/** Phase 13: every running timer counts down, including one set this step. */
export function timersPhase(w: Work): Work {
  const p = w.player;
  const shiftBufferSteps = tick(p.shiftBufferSteps);
  return withPlayer(w, {
    coyoteSteps: tick(p.coyoteSteps),
    jumpBufferSteps: tick(p.jumpBufferSteps),
    shiftBufferSteps,
    shiftBufferNet: shiftBufferSteps === 0 ? 0 : p.shiftBufferNet,
  });
}
