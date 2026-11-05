/**
 * Phases 7-8: move X then Y against the grid with the band at the start of
 * the step, no-embed, and grace on floors only (GDD §4.7-4.8, §4.11).
 */
import { supported, sweepX, sweepY } from './collision';
import { gateFor } from './gating';
import { emit, withPlayer, type StepCtx, type Work } from './work';

/** Phase 7: trapezoid dx, wall stop snaps to the face and zeroes vx (gear kept);
 * `wallStop` only on contact, not while pushing into a wall already touched. */
export function moveXPhase(w: Work, ctx: StepCtx): Work {
  const p = w.player;
  const dx = ((w.vxOld + p.vx) / 2) * ctx.params.dt;
  if (dx === 0) return { ...w, dxMoved: 0 };
  const gate = gateFor(ctx.level, ctx.params, p.x, p.y, ctx.startBand, null);
  const res = sweepX(ctx.level, ctx.params, p.x, p.y, dx, gate);
  const moved = { ...withPlayer(w, { x: res.x }), dxMoved: res.x - p.x };
  if (!res.blocked) return moved;
  const stopped = withPlayer(moved, { vx: 0 });
  // Once per contact (architecture.md 3.2): pushing into a wall the box already touches is silent.
  const contact = w.vxOld !== 0 || res.x !== p.x;
  return contact ? emit(stopped, { type: 'wallStop', body: ctx.body, speed: Math.abs(p.vx) }) : stopped;
}

/** Phase 8: floors, ceilings, then the supported test; walk-offs start coyote time. */
export function moveYPhase(w: Work, ctx: StepCtx): Work {
  const p = w.player;
  const graceBand = p.graceSteps > 0 ? p.graceBand : null;
  const gate = gateFor(ctx.level, ctx.params, p.x, p.y, ctx.startBand, graceBand);
  const res = sweepY(ctx.level, ctx.params, p.x, p.y, w.dy, gate);
  const bonked = res.hit === 'ceiling';
  const moved = withPlayer(w, { y: res.y, vy: res.hit === null ? p.vy : 0 });
  const afterHit = bonked ? emit(moved, { type: 'ceiling', body: ctx.body }) : moved;
  const vy = afterHit.player.vy;
  const grounded = vy >= 0 && supported(ctx.level, ctx.params, p.x, res.y, gate);
  const landed = grounded ? withPlayer(afterHit, { grounded, y: Math.round(res.y), vy: 0 }) : withPlayer(afterHit, { grounded });
  const walkedOff = ctx.startGrounded && !grounded && !w.jumped;
  return walkedOff ? withPlayer(landed, { coyoteSteps: ctx.params.coyoteSteps }) : landed;
}
