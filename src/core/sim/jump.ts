/**
 * Phases 4-6: ground speed (via motion), jump with coyote and buffer, gravity
 * (GDD §4.4, §4.10, jump.md).
 */
import { groundSpeed } from '../motion';
import { withPlayer, emit, type StepCtx, type Work } from './work';

/** Phase 4: only when grounded at the start of the step. */
export function groundPhase(w: Work, ctx: StepCtx): Work {
  if (!ctx.startGrounded) return w;
  const p = w.player;
  const target = p.moveDir * ctx.params.gearSpeeds[p.gear];
  return withPlayer(w, { vx: groundSpeed(p.vx, target, ctx.params) });
}

/** Phase 5: launch if a jump is pressed or buffered and the player is grounded or in coyote time. */
export function jumpPhase(w: Work, ctx: StepCtx): Work {
  const p = w.player;
  const wants = ctx.pressed.jump || p.jumpBufferSteps > 0;
  const can = ctx.startGrounded || p.coyoteSteps > 0;
  if (wants && can) {
    const launched = withPlayer(w, {
      vy: -ctx.params.jumpSpeed,
      grounded: false,
      graceSteps: 0,
      graceBand: null,
      airDistance: 0,
      coyoteSteps: 0,
      jumpBufferSteps: 0,
    });
    const event = { type: 'jump', coyote: !ctx.startGrounded, buffered: !ctx.pressed.jump } as const;
    return emit({ ...launched, jumped: true }, event);
  }
  if (ctx.pressed.jump && !ctx.startGrounded) return withPlayer(w, { jumpBufferSteps: ctx.params.jumpBufferSteps });
  return w;
}

/** Phase 6: exact constant-acceleration step, then cap the fall speed. */
export function gravityPhase(w: Work, ctx: StepCtx): Work {
  const p = w.player;
  if (p.grounded) return { ...w, dy: 0 };
  const { dt, gravity, maxFallSpeed } = ctx.params;
  const dy = p.vy * dt + 0.5 * gravity * dt * dt;
  return { ...withPlayer(w, { vy: Math.min(p.vy + gravity * dt, maxFallSpeed) }), dy };
}
