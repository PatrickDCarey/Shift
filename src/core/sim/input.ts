/**
 * Phases 1-3: press edges, shifting (ground) or shift buffering (air), and
 * direction priority / facing (GDD §4.2-4.3).
 */
import { INPUT_BUTTONS, type InputFrame, type MoveDir } from '../types';
import { clampGear, emit, withPlayer, type StepCtx, type Work } from './work';

/** The frame as stored in `prevInput`: exactly the six contract buttons, nothing a sampler may add. */
export function recordInput(input: InputFrame): InputFrame {
  return Object.fromEntries(INPUT_BUTTONS.map((b) => [b, input[b]])) as unknown as InputFrame;
}

/** pressed(b) = input[b] && !prevInput[b] for every button. */
export function pressEdges(input: InputFrame, prev: InputFrame): InputFrame {
  return Object.fromEntries(INPUT_BUTTONS.map((b) => [b, input[b] && !prev[b]])) as unknown as InputFrame;
}

/** Phase 2. Both shifts on one step cancel (net 0). */
export function shiftPhase(w: Work, ctx: StepCtx): Work {
  const net = Number(ctx.pressed.shiftUp) - Number(ctx.pressed.shiftDown);
  if (net === 0) return w;
  const p = w.player;
  if (ctx.startGrounded) {
    const gear = clampGear(p.gear + net, ctx.params);
    return gear === p.gear ? w : emit(withPlayer(w, { gear }), { type: 'shift', body: 0, from: p.gear, to: gear });
  }
  const shiftBufferNet = p.shiftBufferNet + net;
  const buffered = withPlayer(w, { shiftBufferNet, shiftBufferSteps: ctx.params.shiftBufferSteps });
  return emit(buffered, { type: 'shiftBuffered', body: 0, net: shiftBufferNet });
}

/** Only L pressed -> -1, only R -> +1, both on one step -> 0, none -> unchanged. */
export function nextPriority(prev: MoveDir, pressed: InputFrame): MoveDir {
  if (pressed.left && pressed.right) return 0;
  if (pressed.left) return -1;
  if (pressed.right) return 1;
  return prev;
}

/** One held -> it; none -> 0; both -> the priority winner. */
export function heldDir(input: InputFrame, priority: MoveDir): MoveDir {
  if (input.left && input.right) return priority;
  if (input.left) return -1;
  if (input.right) return 1;
  return 0;
}

/** Phase 3, per-body part: the shared d (computed once in `step`) sets this body's moveDir and facing. */
export function directionPhase(w: Work, ctx: StepCtx): Work {
  const moveDir = ctx.moveDir;
  return withPlayer(w, { moveDir, facing: moveDir === 0 ? w.player.facing : moveDir });
}
